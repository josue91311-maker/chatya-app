from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.models.order import Order

router = APIRouter()

@router.get("/{tracking_token}")
def get_tracking_info(tracking_token: str, db: Session = Depends(get_db)):
    order = (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.company))
        .filter(Order.tracking_token == tracking_token)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
        
    return {
        "success": True,
        "data": {
            "order_code": order.order_code,
            "status": order.status,
            "customer_name": order.customer_name,
            "delivery_method": order.delivery_method,
            "payment_method": order.payment_method,
            "delivery_address": order.delivery_address,
            "delivery_district": order.delivery_district,
            "delivery_reference": order.delivery_reference,
            "notes": order.notes,
            "subtotal": order.subtotal,
            "delivery_cost": order.delivery_cost,
            "total": order.total,
            "created_at": order.created_at,
            "company_name": order.company.name if order.company else "MusicSap",
            "items": [
                {
                    "product_name": item.product_name,
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "total_price": item.total_price or (item.unit_price * item.quantity)
                } for item in order.items
            ],
            "history": [{"status": h.status, "changed_at": h.changed_at} for h in order.history]
        },
        "message": "Información de seguimiento recuperada correctamente"
    }
