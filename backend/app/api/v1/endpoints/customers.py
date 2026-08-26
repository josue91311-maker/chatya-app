from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_sales_or_admin
from app.models.customer import Customer

router = APIRouter()


def customer_to_dict(c: Customer) -> dict:
    return {
        "id": c.id,
        "company_id": c.company_id,
        "full_name": c.full_name,
        "whatsapp_number": c.whatsapp_number,
        "email": c.email,
        "total_orders": c.total_orders or 0,
        "total_spent": round(c.total_spent or 0.0, 2),
        "last_order_at": c.last_order_at.isoformat() if c.last_order_at else None,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


@router.get("/")
def read_customers(
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(require_sales_or_admin),
):
    query = db.query(Customer).filter(Customer.company_id == current_user.company_id)
    if search:
        query = query.filter(
            (Customer.full_name.ilike(f"%{search}%")) |
            (Customer.whatsapp_number.ilike(f"%{search}%")) |
            (Customer.email.ilike(f"%{search}%"))
        )

    total = query.count()
    items = query.order_by(Customer.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {"success": True, "data": [customer_to_dict(c) for c in items], "total": total}


@router.post("/")
def create_customer(
    body: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    full_name = body.get("full_name", "").strip()
    whatsapp_number = body.get("whatsapp_number", "").strip()

    if not full_name:
        raise HTTPException(status_code=400, detail="El nombre del cliente es obligatorio")

    # Check if number exists for this company
    if whatsapp_number and whatsapp_number != "00000000000":
        existing = db.query(Customer).filter(
            Customer.company_id == current_user.company_id,
            Customer.whatsapp_number == whatsapp_number,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Ya existe un cliente registrado con el WhatsApp {whatsapp_number}")

    customer = Customer(
        company_id=current_user.company_id,
        full_name=full_name,
        whatsapp_number=whatsapp_number or "00000000000",
        email=body.get("email", None),
        total_orders=int(body.get("total_orders", 0)),
        total_spent=float(body.get("total_spent", 0.0)),
        created_at=datetime.utcnow(),
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return {"success": True, "data": customer_to_dict(customer), "message": "Cliente creado correctamente"}


@router.get("/{customer_id}")
def read_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.company_id == current_user.company_id,
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return {"success": True, "data": customer_to_dict(customer)}


@router.put("/{customer_id}")
def update_customer(
    customer_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.company_id == current_user.company_id,
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    for field in ["full_name", "whatsapp_number", "email"]:
        if field in body and body[field] is not None:
            setattr(customer, field, body[field])

    db.commit()
    db.refresh(customer)
    return {"success": True, "data": customer_to_dict(customer), "message": "Cliente actualizado"}


@router.delete("/{customer_id}")
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.company_id == current_user.company_id,
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    db.delete(customer)
    db.commit()
    return {"success": True, "message": "Cliente eliminado"}
