from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_sales_or_admin
from app.models.order import Order, OrderItem, OrderStatusHistory
from app.models.product import Product
from app.models.inventory import InventoryMovement
from app.schemas.order import OrderOut

router = APIRouter()

@router.get("/", response_model=List[OrderOut])
def read_orders(
    status: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = 1,
    limit: int = 100,
    db: Session = Depends(get_db), 
    current_user = Depends(require_sales_or_admin)
):
    query = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.company_id == current_user.company_id)
    )
    
    if status and status != "all":
        query = query.filter(Order.status == status)
        
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            (Order.order_code.ilike(search_fmt)) |
            (Order.customer_name.ilike(search_fmt)) |
            (Order.whatsapp_number.ilike(search_fmt)) |
            (Order.invoice_number.ilike(search_fmt))
        )

    if date_from:
        try:
            # Handle YYYY-MM-DD
            dt_from = datetime.fromisoformat(date_from.strip())
            query = query.filter(Order.created_at >= dt_from)
        except Exception:
            pass

    if date_to:
        try:
            # Handle YYYY-MM-DD inclusive to end of day
            to_str = date_to.strip()
            if "T" not in to_str and " " not in to_str:
                to_str += " 23:59:59"
            dt_to = datetime.fromisoformat(to_str)
            query = query.filter(Order.created_at <= dt_to)
        except Exception:
            pass
        
    skip = (page - 1) * limit
    orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    return orders


@router.get("/export")
def export_orders(db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    return {"message": "Export initiated"}


@router.get("/{id}", response_model=OrderOut)
def read_order(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == id, Order.company_id == current_user.company_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return order


@router.put("/{id}/status")
def update_order_status(
    id: int, 
    payload: dict = Body(...), 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_active_user)
):
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == id, Order.company_id == current_user.company_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    new_status = payload.get("status")
    cancel_reason = payload.get("cancel_reason", "").strip()

    if not new_status:
        raise HTTPException(status_code=400, detail="Debe especificar el nuevo estado")

    prev_status = order.status
    order.status = new_status

    # Record history
    history_entry = OrderStatusHistory(
        order_id=order.id,
        status=new_status,
        note=cancel_reason if new_status.lower() in ["anulado", "cancelled", "cancelado"] else payload.get("note"),
        changed_by=current_user.id
    )
    db.add(history_entry)

    # Automatic Stock Return if Order is Cancelled/Anulado
    is_cancelling = new_status.lower() in ["anulado", "cancelled", "cancelado"]
    was_cancelled = prev_status.lower() in ["anulado", "cancelled", "cancelado"]

    if is_cancelling and not was_cancelled:
        # Return inventory for every item
        for item in order.items:
            if item.product_id:
                prod = db.query(Product).filter(Product.id == item.product_id, Product.company_id == current_user.company_id).first()
                if prod:
                    prev_stock = prod.stock
                    prod.stock += item.quantity
                    db.add(InventoryMovement(
                        company_id=current_user.company_id,
                        product_id=prod.id,
                        movement_type="ENTRADA",
                        quantity=item.quantity,
                        previous_stock=prev_stock,
                        new_stock=prod.stock,
                        reason=f"Devolución por Anulación de Pedido #{order.order_code}" + (f": {cancel_reason}" if cancel_reason else ""),
                        user_name=current_user.full_name or "Vendedor"
                    ))

    db.commit()
    return {
        "success": True, 
        "message": f"Estado del pedido actualizado a '{new_status}'",
        "order_code": order.order_code,
        "stock_returned": is_cancelling and not was_cancelled
    }


@router.put("/{id}")
def update_order(
    id: int, 
    body: dict = Body(...), 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_active_user)
):
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == id, Order.company_id == current_user.company_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    # Update basic fields
    for field in ["customer_name", "whatsapp_number", "delivery_address", "delivery_district", "delivery_reference", "notes", "status", "receipt_type", "receipt_data", "invoice_number"]:
        if field in body:
            setattr(order, field, body[field])

    if "delivery_cost" in body:
        order.delivery_cost = float(body["delivery_cost"])

    # If items are updated
    if "items" in body and isinstance(body["items"], list):
        # Existing items map
        existing_items_map = {item.id: item for item in order.items}
        
        # Calculate subtotal
        new_subtotal = 0.0

        # We will replace items
        # 1. First adjust stock differences for modified or removed items
        for old_item in order.items:
            # If product exists, return stock temporarily, will deduct new quantities later
            if old_item.product_id:
                prod = db.query(Product).filter(Product.id == old_item.product_id).first()
                if prod:
                    prod.stock += old_item.quantity

        # Delete existing order items
        db.query(OrderItem).filter(OrderItem.order_id == order.id).delete()

        # Add new items and deduct stock
        for i_data in body["items"]:
            pid = i_data.get("product_id")
            pname = i_data.get("product_name", "Producto")
            qty = int(i_data.get("quantity", 1))
            price = float(i_data.get("unit_price", 0))
            total_p = price * qty

            new_item = OrderItem(
                order_id=order.id,
                product_id=pid,
                product_name=pname,
                product_sku=i_data.get("product_sku", ""),
                quantity=qty,
                unit_price=price,
                total_price=total_p
            )
            db.add(new_item)
            new_subtotal += total_p

            # Deduct stock for new quantity
            if pid:
                prod = db.query(Product).filter(Product.id == pid).first()
                if prod:
                    prod.stock -= qty

        order.subtotal = new_subtotal
        order.total = new_subtotal + order.delivery_cost - order.discount_amount

    db.commit()
    db.refresh(order)
    return {
        "success": True,
        "message": "Pedido actualizado correctamente",
        "order": {
            "id": order.id,
            "order_code": order.order_code,
            "total": order.total
        }
    }
