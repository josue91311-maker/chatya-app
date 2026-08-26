import re
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.brand import Brand

router = APIRouter()


def slugify(text: str) -> str:
    s = text.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "marca"


def brand_to_dict(b: Brand) -> dict:
    return {
        "id": b.id,
        "company_id": b.company_id,
        "name": b.name,
        "slug": b.slug,
        "description": b.description,
        "logo_url": b.logo_url,
        "sort_order": b.sort_order or 0,
        "is_active": b.is_active if b.is_active is not None else True,
        "created_at": b.created_at.isoformat() if b.created_at else None,
    }


@router.get("/")
def read_brands(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    brands = (
        db.query(Brand)
        .filter(Brand.company_id == current_user.company_id)
        .order_by(Brand.sort_order.asc(), Brand.name.asc())
        .all()
    )
    return {"success": True, "data": [brand_to_dict(b) for b in brands]}


@router.post("/")
def create_brand(
    body: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    name = body.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="El nombre de la marca es obligatorio")

    slug = body.get("slug") or slugify(name)
    existing = db.query(Brand).filter(
        Brand.company_id == current_user.company_id,
        Brand.slug == slug,
    ).first()
    if existing:
        slug = f"{slug}-{uuid.uuid4().hex[:4]}"

    brand = Brand(
        company_id=current_user.company_id,
        name=name,
        slug=slug,
        description=body.get("description", ""),
        logo_url=body.get("logo_url", None),
        sort_order=int(body.get("sort_order", 0)),
        is_active=body.get("is_active", True),
    )
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return {"success": True, "data": brand_to_dict(brand), "message": "Marca creada correctamente"}


@router.get("/{brand_id}")
def read_brand(
    brand_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    brand = db.query(Brand).filter(
        Brand.id == brand_id,
        Brand.company_id == current_user.company_id,
    ).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Marca no encontrada")
    return {"success": True, "data": brand_to_dict(brand)}


@router.put("/{brand_id}")
def update_brand(
    brand_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    brand = db.query(Brand).filter(
        Brand.id == brand_id,
        Brand.company_id == current_user.company_id,
    ).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Marca no encontrada")

    if "name" in body and body["name"]:
        brand.name = body["name"].strip()
        if "slug" not in body:
            brand.slug = slugify(brand.name)

    if "slug" in body and body["slug"]:
        brand.slug = body["slug"].strip()

    if "description" in body:
        brand.description = body["description"]

    if "logo_url" in body:
        brand.logo_url = body["logo_url"]

    if "sort_order" in body:
        brand.sort_order = int(body["sort_order"])

    if "is_active" in body:
        brand.is_active = bool(body["is_active"])

    db.commit()
    db.refresh(brand)
    return {"success": True, "data": brand_to_dict(brand), "message": "Marca actualizada"}


@router.delete("/{brand_id}")
def delete_brand(
    brand_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    brand = db.query(Brand).filter(
        Brand.id == brand_id,
        Brand.company_id == current_user.company_id,
    ).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Marca no encontrada")

    db.delete(brand)
    db.commit()
    return {"success": True, "message": "Marca eliminada"}
