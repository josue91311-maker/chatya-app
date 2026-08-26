from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Optional
import uuid, json
from datetime import datetime

from app.core.database import get_db
from app.models.company import Company
from app.models.product import Product, ProductUnitFactor
from app.models.category import Category
from app.models.promotion import Promotion
from app.models.order import Order, OrderItem, OrderStatusHistory
from app.models.customer import Customer
from app.models.inventory import InventoryMovement
from app.schemas.order import OrderCreate
from app.services.whatsapp_service import (
    generate_whatsapp_message,
    generate_whatsapp_url,
    generate_tracking_url,
)

router = APIRouter()


def _get_company_or_404(db: Session, slug: str) -> Company:
    company = db.query(Company).filter(Company.slug == slug, Company.is_active == True).first()
    if not company:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    return company


def _next_order_code(db: Session, company_id: int) -> str:
    last = (
        db.query(Order)
        .filter(Order.company_id == company_id)
        .order_by(Order.id.desc())
        .first()
    )
    next_n = (last.id + 1) if last else 1
    return f"PED-{next_n:06d}"


# ===== Customer lookup by phone =====
@router.get("/{company_slug}/customer-lookup")
def customer_lookup(company_slug: str, phone: str, db: Session = Depends(get_db)):
    company = _get_company_or_404(db, company_slug)
    clean_phone = "".join(filter(str.isdigit, phone))
    if not clean_phone or len(clean_phone) < 6:
        return {"exists": False}

    customer = (
        db.query(Customer)
        .filter(
            Customer.company_id == company.id,
            Customer.whatsapp_number == clean_phone,
        )
        .first()
    )

    if customer and customer.full_name and customer.full_name != "CLIENTES VARIOS":
        return {
            "exists": True,
            "full_name": customer.full_name,
            "email": customer.email,
        }
    return {"exists": False}


# ===== GET store info =====
@router.get("/{company_slug}")
def get_store_info(company_slug: str, db: Session = Depends(get_db)):
    company = _get_company_or_404(db, company_slug)
    config = company.config

    payment_methods = []
    for pm in company.payment_methods:
        if pm.is_active:
            payment_methods.append({
                "id": pm.id,
                "name": pm.name,
                "type": pm.type,
                "instructions": pm.instructions,
                "sort_order": pm.sort_order,
            })

    districts = []
    if config and config.covered_districts:
        try:
            districts = json.loads(config.covered_districts)
        except Exception:
            pass

    hours = None
    if company.business_hours:
        try:
            hours = json.loads(company.business_hours)
        except Exception:
            pass

    return {
        "success": True,
        "data": {
            "id": company.id,
            "name": company.name,
            "slug": company.slug,
            "logo_url": company.logo_url,
            "phone_whatsapp": company.phone_whatsapp,
            "primary_color": company.primary_color,
            "secondary_color": company.secondary_color,
            "accent_color": company.accent_color,
            "currency": company.currency,
            "currency_symbol": company.currency_symbol,
            "welcome_message": config.store_description if config else None,
            "description": config.store_description if config else None,
            "delivery_enabled": config.delivery_enabled if config else True,
            "pickup_enabled": config.pickup_enabled if config else True,
            "dine_in_enabled": config.dine_in_enabled if config else False,
            "delivery_mode": getattr(config, "delivery_mode", "fixed") or "fixed" if config else "fixed",
            "covered_districts": districts,
            "show_estimated_time": bool(getattr(config, "show_estimated_time", False)) if config else False,
            "business_hours": hours,
            "tax_enabled": config.tax_enabled if config else False,
            "tax_percentage": config.tax_percentage if config else 0,
            "prices_include_tax": config.prices_include_tax if config else True,
            "delivery_cost": config.delivery_cost if config else 0,
            "free_delivery_from": config.free_delivery_from if config else None,
            "min_order_amount": config.min_order_amount if config else None,
            "estimated_delivery_minutes": config.estimated_delivery_minutes if config else 30,
            "receipt_none": config.receipt_none if config else True,
            "receipt_boleta": config.receipt_boleta if config else False,
            "receipt_factura": config.receipt_factura if config else False,
            "hide_out_of_stock": config.hide_out_of_stock if config else False,
            "payment_methods": sorted(payment_methods, key=lambda x: x["sort_order"]),
        },
        "message": "Store info retrieved successfully",
    }


# ===== GET products =====
@router.get("/{company_slug}/products")
def get_store_products(
    company_slug: str,
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    featured: Optional[bool] = None,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    company = _get_company_or_404(db, company_slug)
    config = company.config

    q = db.query(Product).filter(
        Product.company_id == company.id,
        Product.is_active == True,
        Product.show_in_store == True,
    )

    if config and config.hide_out_of_stock:
        q = q.filter(Product.stock > 0)

    if category_id:
        q = q.filter(Product.category_id == category_id)
    if search:
        q = q.filter(Product.name.ilike(f"%{search}%"))
    if featured is not None:
        q = q.filter(Product.is_featured == featured)

    q = q.order_by(Product.sort_order.asc(), Product.id.asc())
    products = q.offset((page - 1) * limit).limit(limit).all()

    result = []
    for p in products:
        primary_img = next((img.url for img in p.images if img.is_primary), None)
        factors = [
            {
                "id": uf.id,
                "unit_name": uf.unit_name,
                "factor": uf.factor,
                "price": uf.price,
                "is_base": uf.is_base,
            }
            for uf in (p.unit_factors or [])
            if (uf.for_sale if uf.for_sale is not None else True) and uf.is_active
        ]
        result.append({
            "id": p.id,
            "name": p.name,
            "slug": p.slug,
            "description": p.description,
            "unit_name": p.unit_name or "UNIDAD",
            "price": p.price,
            "previous_price": p.previous_price,
            "stock": p.stock,
            "image_url": primary_img,
            "category_id": p.category_id,
            "is_featured": p.is_featured,
            "max_per_order": p.max_per_order,
            "sku": p.sku,
            "allow_unit_selection": p.allow_unit_selection if p.allow_unit_selection is not None else True,
            "unit_factors": factors,
        })

    return {"success": True, "data": result, "message": "Products retrieved"}


# ===== GET categories =====
@router.get("/{company_slug}/categories")
def get_store_categories(company_slug: str, db: Session = Depends(get_db)):
    company = _get_company_or_404(db, company_slug)
    categories = (
        db.query(Category)
        .filter(Category.company_id == company.id, Category.is_active == True)
        .order_by(Category.sort_order.asc())
        .all()
    )
    data = [
        {
            "id": c.id,
            "name": c.name,
            "slug": c.slug,
            "image_url": c.image_url,
            "parent_id": c.parent_id,
            "sort_order": c.sort_order,
            "is_active": c.is_active,
        }
        for c in categories
    ]
    return {"success": True, "data": data, "message": "Categories retrieved"}


# ===== GET promotions =====
@router.get("/{company_slug}/promotions")
def get_store_promotions(company_slug: str, db: Session = Depends(get_db)):
    company = _get_company_or_404(db, company_slug)
    now = datetime.utcnow()
    promotions = (
        db.query(Promotion)
        .filter(
            Promotion.company_id == company.id,
            Promotion.is_active == True,
        )
        .all()
    )
    # Filter by date if set
    active = [
        p for p in promotions
        if (not p.starts_at or p.starts_at <= now)
        and (not p.ends_at or p.ends_at >= now)
    ]
    data = [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "promotion_type": p.promotion_type,
            "discount_value": p.discount_value,
        }
        for p in active
    ]
    return {"success": True, "data": data, "message": "Promotions retrieved"}


# ===== GET single product =====
@router.get("/{company_slug}/products/{product_slug}")
def get_store_product(company_slug: str, product_slug: str, db: Session = Depends(get_db)):
    company = _get_company_or_404(db, company_slug)
    product = (
        db.query(Product)
        .filter(
            Product.company_id == company.id,
            Product.slug == product_slug,
            Product.is_active == True,
        )
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    images = [{"id": img.id, "url": img.url, "is_primary": img.is_primary} for img in product.images]
    factors = [
        {
            "id": uf.id,
            "unit_name": uf.unit_name,
            "factor": uf.factor,
            "price": uf.price,
            "is_base": uf.is_base,
        }
        for uf in (product.unit_factors or [])
        if (uf.for_sale if uf.for_sale is not None else True) and uf.is_active
    ]

    return {
        "success": True,
        "data": {
            "id": product.id,
            "name": product.name,
            "slug": product.slug,
            "description": product.description,
            "unit_name": product.unit_name or "UNIDAD",
            "price": product.price,
            "previous_price": product.previous_price,
            "stock": product.stock,
            "images": images,
            "image_url": next((img["url"] for img in images if img["is_primary"]), images[0]["url"] if images else None),
            "category_id": product.category_id,
            "is_featured": product.is_featured,
            "max_per_order": product.max_per_order,
            "sku": product.sku,
            "allow_unit_selection": product.allow_unit_selection if product.allow_unit_selection is not None else True,
            "unit_factors": factors,
        },
        "message": "Product retrieved",
    }


# ===== POST create order =====
@router.post("/{company_slug}/orders")
def create_store_order(
    company_slug: str,
    order_in: OrderCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    company = _get_company_or_404(db, company_slug)
    config = company.config

    # Find or create customer
    customer = (
        db.query(Customer)
        .filter(
            Customer.company_id == company.id,
            Customer.whatsapp_number == order_in.whatsapp_number,
        )
        .first()
    )
    if not customer:
        customer = Customer(
            company_id=company.id,
            full_name=order_in.customer_name,
            whatsapp_number=order_in.whatsapp_number,
            ip_address=request.client.host if request.client else None,
        )
        db.add(customer)
        db.flush()
    else:
        customer.full_name = order_in.customer_name

    if not order_in.items:
        raise HTTPException(status_code=400, detail="El carrito de compras está vacío.")

    # Validate stock, product status, and sync official server prices
    validated_items = []
    subtotal = 0.0

    for item in order_in.items:
        product = db.query(Product).filter(
            Product.id == item.product_id,
            Product.company_id == company.id,
            Product.is_active == True
        ).first()

        if not product:
            raise HTTPException(
                status_code=400,
                detail=f"El producto '{item.product_name}' ya no está disponible en la tienda."
            )

        # Check unit factor if used
        factor_multiplier = 1.0
        official_price = float(product.price or 0.0)

        # Check if item name or SKU matches a factor
        matching_factor = db.query(ProductUnitFactor).filter(
            ProductUnitFactor.product_id == product.id,
            ProductUnitFactor.is_active == True
        ).all()

        for uf in matching_factor:
            if uf.unit_name and uf.unit_name.upper() in (item.product_name or "").upper():
                factor_multiplier = float(uf.factor or 1.0)
                official_price = float(uf.price or 0.0)
                break

        # Check stock in base units
        base_units_needed = item.quantity * factor_multiplier
        available_stock = product.stock or 0

        if available_stock < base_units_needed:
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuficiente para '{product.name}'. Solo quedan {available_stock} {product.unit_name or 'unidades'} disponibles en tienda."
            )

        item_total = official_price * item.quantity
        subtotal += item_total

        validated_items.append({
            "product_obj": product,
            "product_id": product.id,
            "product_name": item.product_name or product.name,
            "product_sku": product.sku or item.product_sku,
            "quantity": item.quantity,
            "base_qty_to_decrement": base_units_needed,
            "unit_price": official_price,
            "discount_amount": float(item.discount_amount or 0.0),
            "total_price": item_total,
        })

    discount_amount = sum(item["discount_amount"] for item in validated_items)
    
    delivery_cost = 0.0
    if order_in.delivery_method == "delivery":
        if order_in.delivery_cost is not None:
            delivery_cost = float(order_in.delivery_cost)
        elif config and config.delivery_cost:
            delivery_cost = float(config.delivery_cost)

    tax_amount = 0.0
    if config and config.tax_enabled and not config.prices_include_tax:
        tax_amount = subtotal * (config.tax_percentage / 100)

    total = subtotal + delivery_cost + tax_amount - discount_amount

    # Serialize receipt_data if it's a dict
    receipt_data_str = None
    if order_in.receipt_data is not None:
        if isinstance(order_in.receipt_data, (dict, list)):
            receipt_data_str = json.dumps(order_in.receipt_data)
        else:
            receipt_data_str = str(order_in.receipt_data)

    # Update customer stats
    customer.total_orders = (customer.total_orders or 0) + 1
    customer.total_spent = (customer.total_spent or 0.0) + total
    customer.last_order_at = datetime.utcnow()

    # Create order
    tracking_token = str(uuid.uuid4())
    order = Order(
        company_id=company.id,
        customer_id=customer.id,
        tracking_token=tracking_token,
        status="pending",
        delivery_method=order_in.delivery_method,
        payment_method=order_in.payment_method,
        receipt_type=order_in.receipt_type,
        receipt_data=receipt_data_str,
        subtotal=subtotal,
        discount_amount=discount_amount,
        tax_amount=tax_amount,
        delivery_cost=delivery_cost,
        total=total,
        customer_name=order_in.customer_name,
        whatsapp_number=order_in.whatsapp_number,
        ip_address=request.client.host if request.client else None,
        delivery_address=order_in.delivery_address,
        delivery_reference=order_in.delivery_reference,
        delivery_district=order_in.delivery_district,
        notes=order_in.notes,
    )
    db.add(order)
    db.flush()  # get order.id

    # Generate order code
    order.order_code = f"PED-{order.id:06d}"

    # Order items + decrement stock
    for v_item in validated_items:
        order_item = OrderItem(
            order_id=order.id,
            product_id=v_item["product_id"],
            product_name=v_item["product_name"],
            product_sku=v_item["product_sku"],
            quantity=v_item["quantity"],
            unit_price=v_item["unit_price"],
            discount_amount=v_item["discount_amount"],
            total_price=v_item["total_price"],
        )
        db.add(order_item)

        # Decrement stock and record Kardex movement
        prod_obj = v_item["product_obj"]
        if prod_obj:
            prev_stock = prod_obj.stock or 0
            decrement_qty = v_item["base_qty_to_decrement"]
            prod_obj.stock = max(0, prev_stock - decrement_qty)
            db.add(InventoryMovement(
                company_id=company.id,
                product_id=prod_obj.id,
                movement_type="SALIDA",
                quantity=decrement_qty,
                previous_stock=prev_stock,
                new_stock=prod_obj.stock,
                reason=f"Venta en Tienda Web - Pedido #{order.order_code}",
                reference_code=order.order_code,
                user_name="Cliente Web",
                created_at=datetime.utcnow(),
            ))

    # Initial status history
    history = OrderStatusHistory(
        order_id=order.id,
        status="pending",
        note="Pedido recibido",
        changed_at=datetime.utcnow(),
    )
    db.add(history)

    # Update customer stats
    customer.total_orders = (customer.total_orders or 0) + 1
    customer.total_spent = (customer.total_spent or 0.0) + total
    customer.last_order_at = datetime.utcnow()

    db.commit()
    db.refresh(order)

    # Generate WhatsApp message
    items_for_msg = [
        {
            "product_name": i.product_name,
            "quantity": i.quantity,
            "total_price": i.total_price,
        }
        for i in order.items
    ]
    whatsapp_msg = generate_whatsapp_message(
        order_code=order.order_code,
        customer_name=order.customer_name,
        items=items_for_msg,
        currency=company.currency_symbol,
        subtotal=order.subtotal,
        discount_amount=order.discount_amount,
        delivery_cost=order.delivery_cost,
        total=order.total,
        payment_method=order.payment_method,
        delivery_method=order.delivery_method,
        address=order.delivery_address,
        district=order.delivery_district,
        tracking_token=order.tracking_token,
        whatsapp_number=order.whatsapp_number,
    )
    wa_url = generate_whatsapp_url(company.phone_whatsapp, whatsapp_msg)
    tracking_url = generate_tracking_url(tracking_token)

    return {
        "success": True,
        "data": {
            "order_id": order.id,
            "order_code": order.order_code,
            "tracking_token": tracking_token,
            "tracking_url": tracking_url,
            "whatsapp_url": wa_url,
            "whatsapp_message": whatsapp_msg,
            "total": order.total,
        },
        "message": "Pedido creado exitosamente",
    }
