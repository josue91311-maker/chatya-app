import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_admin
from app.models.company import Company
from app.models.config import CompanyConfig, OrderStatus, PaymentMethod

router = APIRouter()


# ===== Company Config & Business Hours =====

DEFAULT_BUSINESS_HOURS = {
  "monday":    {"open": "08:00", "close": "20:00", "is_active": True},
  "tuesday":   {"open": "08:00", "close": "20:00", "is_active": True},
  "wednesday": {"open": "08:00", "close": "20:00", "is_active": True},
  "thursday":  {"open": "08:00", "close": "20:00", "is_active": True},
  "friday":    {"open": "08:00", "close": "22:00", "is_active": True},
  "saturday":  {"open": "09:00", "close": "22:00", "is_active": True},
  "sunday":    {"open": "09:00", "close": "18:00", "is_active": True},
}


@router.get("/company")
def get_company_config(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    cid = current_user.company_id
    company = db.query(Company).filter(Company.id == cid).first()
    config = db.query(CompanyConfig).filter(CompanyConfig.company_id == cid).first()

    if not config:
        config = CompanyConfig(company_id=cid)
        db.add(config)
        db.commit()
        db.refresh(config)

    hours = DEFAULT_BUSINESS_HOURS
    if company and company.business_hours:
        try:
            hours = json.loads(company.business_hours)
        except Exception:
            pass

    districts = []
    if config.covered_districts:
        try:
            districts = json.loads(config.covered_districts)
        except Exception:
            pass

    return {
        "success": True,
        "data": {
            "company": {
                "id": company.id if company else None,
                "name": company.name if company else "",
                "slug": company.slug if company else "",
                "ruc": company.ruc if company else "",
                "logo_url": company.logo_url if company else None,
                "phone_whatsapp": company.phone_whatsapp if company else "",
                "address": company.address if company else "",
                "city": company.city if company else "",
                "country": company.country if company else "",
                "primary_color": company.primary_color if company else "#1E293B",
                "currency_symbol": company.currency_symbol if company else "S/",
                "business_hours": hours,
            },
            "config": {
                "delivery_enabled": config.delivery_enabled,
                "pickup_enabled": config.pickup_enabled,
                "dine_in_enabled": config.dine_in_enabled,
                "delivery_mode": getattr(config, "delivery_mode", "fixed") or "fixed",
                "covered_districts": districts,
                "show_estimated_time": bool(getattr(config, "show_estimated_time", False)),
                "delivery_cost": config.delivery_cost,
                "free_delivery_from": config.free_delivery_from,
                "min_order_amount": config.min_order_amount,
                "estimated_delivery_minutes": config.estimated_delivery_minutes,
                "tax_enabled": config.tax_enabled,
                "tax_percentage": config.tax_percentage,
                "prices_include_tax": config.prices_include_tax,
                "receipt_none": config.receipt_none,
                "receipt_boleta": config.receipt_boleta,
                "receipt_factura": config.receipt_factura,
                "hide_out_of_stock": config.hide_out_of_stock,
                "store_description": config.store_description,
                "welcome_message": config.welcome_message,
            }
        }
    }


@router.put("/company")
def update_company_config(body: dict, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    cid = current_user.company_id
    company = db.query(Company).filter(Company.id == cid).first()
    config = db.query(CompanyConfig).filter(CompanyConfig.company_id == cid).first()

    if not config:
        config = CompanyConfig(company_id=cid)
        db.add(config)

    # Update company fields
    company_data = body.get("company", {})
    for field in ["name", "ruc", "logo_url", "phone_whatsapp", "address", "city", "country"]:
        if field in company_data:
            setattr(company, field, company_data[field])

    if "business_hours" in company_data:
        hours_val = company_data["business_hours"]
        company.business_hours = json.dumps(hours_val) if isinstance(hours_val, dict) else str(hours_val)

    # Update config fields
    config_data = body.get("config", {})
    for field in [
        "delivery_enabled", "pickup_enabled", "dine_in_enabled",
        "delivery_mode", "show_estimated_time",
        "delivery_cost", "free_delivery_from", "min_order_amount",
        "estimated_delivery_minutes", "tax_enabled", "tax_percentage",
        "prices_include_tax", "receipt_none", "receipt_boleta", "receipt_factura",
        "hide_out_of_stock", "store_description", "welcome_message",
    ]:
        if field in config_data:
            setattr(config, field, config_data[field])

    if "covered_districts" in config_data:
        dist_val = config_data["covered_districts"]
        config.covered_districts = json.dumps(dist_val) if isinstance(dist_val, list) else str(dist_val)

    db.commit()
    return {"success": True, "message": "Configuración actualizada"}


# ===== Payment Methods =====

@router.get("/payment-methods")
def get_payment_methods(db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    pms = db.query(PaymentMethod).filter(
        PaymentMethod.company_id == current_user.company_id
    ).order_by(PaymentMethod.sort_order.asc()).all()
    data = [
        {
            "id": pm.id, "name": pm.name, "type": pm.type,
            "instructions": pm.instructions, "is_active": pm.is_active,
            "sort_order": pm.sort_order,
        }
        for pm in pms
    ]
    return {"success": True, "data": data}


@router.post("/payment-methods")
def create_payment_method(body: dict, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    pm = PaymentMethod(
        company_id=current_user.company_id,
        name=body.get("name", ""),
        type=body.get("type", "transfer"),
        instructions=body.get("instructions", ""),
        is_active=body.get("is_active", True),
        sort_order=body.get("sort_order", 99),
    )
    db.add(pm)
    db.commit()
    db.refresh(pm)
    return {"success": True, "data": {"id": pm.id, "name": pm.name}}


@router.put("/payment-methods/{pm_id}")
def update_payment_method(pm_id: int, body: dict, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    pm = db.query(PaymentMethod).filter(
        PaymentMethod.id == pm_id, PaymentMethod.company_id == current_user.company_id
    ).first()
    if not pm:
        raise HTTPException(status_code=404, detail="Método de pago no encontrado")
    for field in ["name", "type", "instructions", "is_active", "sort_order"]:
        if field in body:
            setattr(pm, field, body[field])
    db.commit()
    return {"success": True, "message": "Método de pago actualizado"}


@router.delete("/payment-methods/{pm_id}")
def delete_payment_method(pm_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    pm = db.query(PaymentMethod).filter(
        PaymentMethod.id == pm_id, PaymentMethod.company_id == current_user.company_id
    ).first()
    if not pm:
        raise HTTPException(status_code=404, detail="Método de pago no encontrado")
    db.delete(pm)
    db.commit()
    return {"success": True, "message": "Eliminado"}


# ===== Order Statuses =====

@router.get("/order-statuses")
def get_order_statuses(db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    statuses = db.query(OrderStatus).filter(
        OrderStatus.company_id == current_user.company_id
    ).order_by(OrderStatus.sort_order.asc()).all()
    data = [
        {"id": s.id, "name": s.name, "color": s.color, "sort_order": s.sort_order,
         "is_default": s.is_default, "is_final": s.is_final}
        for s in statuses
    ]
    return {"success": True, "data": data}
