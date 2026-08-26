import re
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.category import Category

router = APIRouter()


def slugify(text: str) -> str:
    s = text.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "categoria"


def category_to_dict(c: Category) -> dict:
    return {
        "id": c.id,
        "company_id": c.company_id,
        "name": c.name,
        "slug": c.slug,
        "description": c.description,
        "image_url": c.image_url,
        "parent_id": c.parent_id,
        "sort_order": c.sort_order or 0,
        "is_active": c.is_active if c.is_active is not None else True,
    }


@router.get("/")
def read_categories(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    categories = (
        db.query(Category)
        .filter(Category.company_id == current_user.company_id)
        .order_by(Category.sort_order.asc(), Category.name.asc())
        .all()
    )
    return {"success": True, "data": [category_to_dict(c) for c in categories]}


@router.post("/")
def create_category(
    body: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    name = body.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="El nombre de la categoría es obligatorio")

    slug = body.get("slug") or slugify(name)
    # Ensure slug uniqueness for company
    existing = db.query(Category).filter(
        Category.company_id == current_user.company_id,
        Category.slug == slug,
    ).first()
    if existing:
        slug = f"{slug}-{uuid.uuid4().hex[:4]}"

    category = Category(
        company_id=current_user.company_id,
        name=name,
        slug=slug,
        description=body.get("description", ""),
        image_url=body.get("image_url", None),
        parent_id=int(body["parent_id"]) if body.get("parent_id") else None,
        sort_order=int(body.get("sort_order", 0)),
        is_active=body.get("is_active", True),
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return {"success": True, "data": category_to_dict(category), "message": "Categoría creada correctamente"}


@router.get("/{category_id}")
def read_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.company_id == current_user.company_id,
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    return {"success": True, "data": category_to_dict(category)}


@router.put("/{category_id}")
def update_category(
    category_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.company_id == current_user.company_id,
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    if "name" in body and body["name"]:
        category.name = body["name"].strip()
        if "slug" not in body:
            category.slug = slugify(category.name)

    if "slug" in body and body["slug"]:
        category.slug = body["slug"].strip()

    if "description" in body:
        category.description = body["description"]

    if "image_url" in body:
        category.image_url = body["image_url"]

    if "parent_id" in body:
        category.parent_id = int(body["parent_id"]) if body["parent_id"] else None

    if "sort_order" in body:
        category.sort_order = int(body["sort_order"])

    if "is_active" in body:
        category.is_active = bool(body["is_active"])

    db.commit()
    db.refresh(category)
    return {"success": True, "data": category_to_dict(category), "message": "Categoría actualizada"}


@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.company_id == current_user.company_id,
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    db.delete(category)
    db.commit()
    return {"success": True, "message": "Categoría eliminada"}
