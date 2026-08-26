from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.promotion import Promotion

router = APIRouter()


def promo_to_dict(p: Promotion) -> dict:
    return {
        "id": p.id,
        "company_id": p.company_id,
        "name": p.name,
        "description": p.description,
        "promotion_type": p.promotion_type,
        "discount_value": p.discount_value,
        "product_ids": p.product_ids,
        "combo_products": p.combo_products,
        "starts_at": p.starts_at.isoformat() if p.starts_at else None,
        "ends_at": p.ends_at.isoformat() if p.ends_at else None,
        "is_active": p.is_active if p.is_active is not None else True,
    }


@router.get("/")
def read_promotions(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    promos = (
        db.query(Promotion)
        .filter(Promotion.company_id == current_user.company_id)
        .order_by(Promotion.id.desc())
        .all()
    )
    return {"success": True, "data": [promo_to_dict(p) for p in promos]}


@router.post("/")
def create_promotion(
    body: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    name = body.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="El nombre de la promoción es obligatorio")

    promo = Promotion(
        company_id=current_user.company_id,
        name=name,
        description=body.get("description", ""),
        promotion_type=body.get("promotion_type", "percentage"),
        discount_value=float(body.get("discount_value", 0.0)),
        is_active=body.get("is_active", True),
    )
    db.add(promo)
    db.commit()
    db.refresh(promo)
    return {"success": True, "data": promo_to_dict(promo), "message": "Promoción creada correctamente"}


@router.get("/{promo_id}")
def read_promotion(
    promo_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    promo = db.query(Promotion).filter(
        Promotion.id == promo_id,
        Promotion.company_id == current_user.company_id,
    ).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Promoción no encontrada")
    return {"success": True, "data": promo_to_dict(promo)}


@router.put("/{promo_id}")
def update_promotion(
    promo_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    promo = db.query(Promotion).filter(
        Promotion.id == promo_id,
        Promotion.company_id == current_user.company_id,
    ).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Promoción no encontrada")

    for field in ["name", "description", "promotion_type", "discount_value", "is_active"]:
        if field in body and body[field] is not None:
            val = body[field]
            if field == "discount_value":
                val = float(val)
            elif field == "is_active":
                val = bool(val)
            setattr(promo, field, val)

    db.commit()
    db.refresh(promo)
    return {"success": True, "data": promo_to_dict(promo), "message": "Promoción actualizada"}


@router.delete("/{promo_id}")
def delete_promotion(
    promo_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    promo = db.query(Promotion).filter(
        Promotion.id == promo_id,
        Promotion.company_id == current_user.company_id,
    ).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Promoción no encontrada")

    db.delete(promo)
    db.commit()
    return {"success": True, "message": "Promoción eliminada"}
