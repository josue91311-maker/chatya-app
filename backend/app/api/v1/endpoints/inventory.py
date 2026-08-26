from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.product import Product
from app.models.order import Order, OrderItem
from app.models.inventory import InventoryMovement

router = APIRouter()


def movement_to_dict(m: InventoryMovement) -> dict:
    return {
        "id": m.id,
        "company_id": m.company_id,
        "product_id": m.product_id,
        "product_name": m.product.name if m.product else "Desconocido",
        "movement_type": m.movement_type,
        "quantity": m.quantity,
        "previous_stock": m.previous_stock,
        "new_stock": m.new_stock,
        "reason": m.reason or "",
        "reference_code": m.reference_code or "",
        "user_name": m.user_name or "Sistema",
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


@router.get("/summary")
def get_inventory_summary(
    category_id: Optional[int] = None,
    brand_name: Optional[str] = None,
    search: Optional[str] = None,
    stock_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = (
        db.query(Product)
        .options(
            joinedload(Product.category),
            joinedload(Product.images),
            joinedload(Product.unit_factors),
        )
        .filter(Product.company_id == current_user.company_id)
    )

    if category_id:
        query = query.filter(Product.category_id == category_id)
    if brand_name:
        query = query.filter(Product.brand_name == brand_name)
    if search:
        s = f"%{search}%"
        query = query.filter(
            (Product.name.ilike(s)) |
            (Product.sku.ilike(s)) |
            (Product.brand_name.ilike(s))
        )

    products = query.order_by(Product.name.asc()).all()

    # Calculate committed stock from pending / active orders
    active_orders = (
        db.query(Order.id)
        .filter(
            Order.company_id == current_user.company_id,
            Order.status.in_(["Pendiente", "Recibido", "Preparando", "En camino"]),
        )
        .all()
    )
    active_order_ids = [o.id for o in active_orders]

    committed_map = {}
    if active_order_ids:
        committed_items = (
            db.query(OrderItem.product_id, func.sum(OrderItem.quantity).label("total_qty"))
            .filter(OrderItem.order_id.in_(active_order_ids))
            .group_by(OrderItem.product_id)
            .all()
        )
        for item in committed_items:
            if item.product_id:
                committed_map[item.product_id] = int(item.total_qty or 0)

    summary_list = []
    total_physical = 0
    total_committed = 0
    total_available = 0
    low_stock_count = 0
    out_of_stock_count = 0

    for p in products:
        stock_fisico = p.stock or 0
        stock_comprometido = committed_map.get(p.id, 0)
        stock_disponible = max(0, stock_fisico - stock_comprometido)

        is_out = stock_fisico == 0
        is_low = stock_fisico > 0 and stock_fisico <= (p.min_stock or 2)

        if stock_status == "out_of_stock" and not is_out:
            continue
        if stock_status == "low" and not is_low:
            continue
        if stock_status == "available" and (is_out or is_low):
            continue

        total_physical += stock_fisico
        total_committed += stock_comprometido
        total_available += stock_disponible
        if is_out:
            out_of_stock_count += 1
        if is_low:
            low_stock_count += 1

        images = p.images or []
        primary_img = next((img.url for img in images if img.is_primary), images[0].url if images else None)

        unit_factors = [
            {
                "id": uf.id,
                "unit_name": uf.unit_name,
                "factor": uf.factor,
                "is_base": uf.is_base,
                "for_sale": uf.for_sale if uf.for_sale is not None else True,
                "for_purchase": uf.for_purchase if uf.for_purchase is not None else True,
                "price": uf.price,
            }
            for uf in (p.unit_factors or [])
        ]

        summary_list.append({
            "id": p.id,
            "name": p.name,
            "sku": p.sku or "",
            "brand_name": p.brand_name or "Sin marca",
            "category_name": p.category.name if p.category else "Sin categoría",
            "category_id": p.category_id,
            "unit_name": p.unit_name or "Unidad",
            "price": p.price or 0.0,
            "cost_price": p.cost_price or 0.0,
            "stock_fisico": stock_fisico,
            "stock_comprometido": stock_comprometido,
            "stock_disponible": stock_disponible,
            "min_stock": p.min_stock or 0,
            "image_url": primary_img,
            "is_out_of_stock": is_out,
            "is_low_stock": is_low,
            "unit_factors": unit_factors,
        })

    return {
        "success": True,
        "data": summary_list,
        "kpi": {
            "total_products": len(products),
            "total_physical_stock": total_physical,
            "total_committed_stock": total_committed,
            "total_available_stock": total_available,
            "out_of_stock_count": out_of_stock_count,
            "low_stock_count": low_stock_count,
        },
    }


@router.post("/movements")
def create_inventory_movement(
    body: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    product_id = int(body.get("product_id", 0))
    movement_type = body.get("movement_type", "ENTRADA").upper()
    quantity = int(body.get("quantity", 0))
    unit_factor = float(body.get("unit_factor", 1.0))  # e.g. 12.0 for Caja x12
    unit_label = body.get("unit_label", "").strip()
    reason = body.get("reason", "").strip()

    if not product_id:
        raise HTTPException(status_code=400, detail="Debe seleccionar un producto")
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a 0")
    if movement_type not in ["ENTRADA", "SALIDA", "AJUSTE"]:
        raise HTTPException(status_code=400, detail="Tipo de movimiento inválido")

    product = db.query(Product).filter(
        Product.id == product_id,
        Product.company_id == current_user.company_id,
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # Base units calculation: e.g. 2 Boxes x 12 = 24 base units
    base_quantity = int(quantity * unit_factor) if movement_type != "AJUSTE" else quantity

    previous_stock = product.stock or 0

    if movement_type == "ENTRADA":
        new_stock = previous_stock + base_quantity
        reason_text = f"Entrada de {quantity} {unit_label or 'unidades'} ({base_quantity} u. base). {reason}".strip()
    elif movement_type == "SALIDA":
        if base_quantity > previous_stock:
            raise HTTPException(status_code=400, detail=f"No hay suficiente stock. Disponible: {previous_stock} unidades base")
        new_stock = previous_stock - base_quantity
        reason_text = f"Salida de {quantity} {unit_label or 'unidades'} ({base_quantity} u. base). {reason}".strip()
    else:  # AJUSTE
        new_stock = base_quantity
        reason_text = f"Ajuste directo de stock a {new_stock} u. base. {reason}".strip()

    product.stock = new_stock

    movement = InventoryMovement(
        company_id=current_user.company_id,
        product_id=product.id,
        movement_type=movement_type,
        quantity=base_quantity,
        previous_stock=previous_stock,
        new_stock=new_stock,
        reason=reason_text,
        user_name=current_user.full_name or "Administrador",
        created_at=datetime.utcnow(),
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)

    return {
        "success": True,
        "data": movement_to_dict(movement),
        "message": f"Movimiento registrado: {reason_text}. Nuevo stock total: {new_stock} unidades base",
    }


@router.get("/movements")
def read_inventory_movements(
    product_id: Optional[int] = None,
    movement_type: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = (
        db.query(InventoryMovement)
        .options(joinedload(InventoryMovement.product))
        .filter(InventoryMovement.company_id == current_user.company_id)
    )
    if product_id:
        query = query.filter(InventoryMovement.product_id == product_id)
    if movement_type:
        query = query.filter(InventoryMovement.movement_type == movement_type.upper())

    total = query.count()
    movements = query.order_by(InventoryMovement.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {"success": True, "data": [movement_to_dict(m) for m in movements], "total": total}
