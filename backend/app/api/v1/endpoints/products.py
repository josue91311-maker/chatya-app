import os
import uuid
import shutil
import re
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.product import Product, ProductImage, ProductUnitFactor

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def product_to_dict(p: Product) -> dict:
    images = [
        {"id": img.id, "url": img.url, "is_primary": img.is_primary, "sort_order": img.sort_order}
        for img in (p.images or [])
    ]
    primary = next((img["url"] for img in images if img["is_primary"]), None)
    if not primary and images:
        primary = images[0]["url"]

    try:
        factors = [
            {
                "id": uf.id,
                "unit_name": uf.unit_name,
                "factor": uf.factor,
                "price": uf.price or 0.0,
                "cost_price": uf.cost_price or 0.0,
                "sku": uf.sku,
                "is_base": uf.is_base,
                "for_sale": uf.for_sale if uf.for_sale is not None else True,
                "for_purchase": uf.for_purchase if uf.for_purchase is not None else True,
                "is_active": uf.is_active,
            }
            for uf in (p.unit_factors or [])
        ]
    except Exception:
        factors = []

    if not factors:
        factors = [
            {
                "id": None,
                "unit_name": p.unit_name or "UNIDAD",
                "factor": p.factor or 1.0,
                "price": p.price or 0.0,
                "cost_price": p.cost_price or 0.0,
                "sku": p.sku,
                "is_base": True,
                "for_sale": True,
                "for_purchase": True,
                "is_active": True,
            }
        ]

    return {
        "id": p.id,
        "company_id": p.company_id,
        "category_id": p.category_id,
        "brand_id": p.brand_id,
        "brand_name": p.brand.name if p.brand else (p.brand_name or ""),
        "name": p.name,
        "slug": p.slug,
        "description": p.description,
        "sku": p.sku,
        "unit_name": p.unit_name or "Unidad",
        "cost_price": p.cost_price or 0.0,
        "factor": p.factor or 1.0,
        "price": p.price or 0.0,
        "previous_price": p.previous_price,
        "stock": p.stock or 0,
        "min_stock": p.min_stock or 0,
        "max_per_order": p.max_per_order,
        "is_active": p.is_active if p.is_active is not None else True,
        "is_featured": p.is_featured or False,
        "show_in_store": p.show_in_store if p.show_in_store is not None else False,
        "allow_unit_selection": p.allow_unit_selection if p.allow_unit_selection is not None else True,
        "sort_order": p.sort_order or 0,
        "image_url": primary,
        "images": images,
        "unit_factors": factors,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


from sqlalchemy.orm import Session, joinedload

@router.get("/")
def read_products(
    category_id: Optional[int] = None,
    brand_id: Optional[int] = None,
    brand_name: Optional[str] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    page: int = 1,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    query = (
        db.query(Product)
        .options(
            joinedload(Product.images),
            joinedload(Product.unit_factors),
            joinedload(Product.brand),
        )
        .filter(Product.company_id == current_user.company_id)
    )
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if brand_id:
        query = query.filter(Product.brand_id == brand_id)
    elif brand_name:
        query = query.filter(Product.brand_name == brand_name)
    if search:
        s = f"%{search}%"
        query = query.filter(
            (Product.name.ilike(s)) |
            (Product.sku.ilike(s)) |
            (Product.brand_name.ilike(s))
        )
    if is_active is not None:
        query = query.filter(Product.is_active == is_active)

    total = query.count()
    items = query.order_by(Product.sort_order.asc(), Product.id.desc()).offset((page - 1) * limit).limit(limit).all()
    return {"success": True, "data": [product_to_dict(p) for p in items], "total": total}


@router.post("/")
def create_product(body: dict, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    name = body.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="El nombre del producto es obligatorio")

    slug = re.sub(r"[^a-z0-9]+", "-", name.lower().strip()).strip("-")
    existing = db.query(Product).filter(Product.slug == slug, Product.company_id == current_user.company_id).first()
    if existing:
        slug = f"{slug}-{uuid.uuid4().hex[:4]}"

    cost_price = float(body.get("cost_price", 0.0))
    factor = float(body.get("factor", 1.0))
    raw_price = body.get("price")

    if raw_price is not None and str(raw_price).strip() != "":
        price = float(raw_price)
    elif cost_price > 0 and factor > 0:
        price = round(cost_price * factor, 2)
    else:
        price = 0.0

    unit_factors_data = body.get("unit_factors")
    base_unit_name = body.get("unit_name", "UNIDAD").strip() or "UNIDAD"
    base_price = 0.0

    if unit_factors_data and isinstance(unit_factors_data, list) and len(unit_factors_data) > 0:
        # Find base unit factor or first item
        base_item = next((uf for uf in unit_factors_data if uf.get("is_base")), unit_factors_data[0])
        base_unit_name = base_item.get("unit_name", "UNIDAD")
        base_price = float(base_item.get("price", 0.0))

    product = Product(
        company_id=current_user.company_id,
        name=name,
        slug=slug,
        description=body.get("description", ""),
        sku=body.get("sku", ""),
        brand_id=int(body["brand_id"]) if body.get("brand_id") else None,
        brand_name=body.get("brand_name", "").strip() or None,
        unit_name=base_unit_name,
        cost_price=cost_price,
        factor=factor,
        price=base_price,
        previous_price=float(body["previous_price"]) if body.get("previous_price") else None,
        stock=int(body.get("stock", 0)),
        min_stock=int(body.get("min_stock", 0)),
        max_per_order=int(body.get("max_per_order", 99)),
        category_id=int(body["category_id"]) if body.get("category_id") else None,
        is_active=bool(body.get("is_active", True)),
        is_featured=bool(body.get("is_featured", False)),
        show_in_store=bool(body.get("show_in_store", False)),
        allow_unit_selection=bool(body.get("allow_unit_selection", True)),
        sort_order=int(body.get("sort_order", 0)),
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    # Save Unit Factors
    if unit_factors_data and isinstance(unit_factors_data, list) and len(unit_factors_data) > 0:
        seen_units = set()
        seen_factors = set()
        has_base = any(bool(uf.get("is_base")) for uf in unit_factors_data)

        # Validate duplicates first
        for uf in unit_factors_data:
            u_name = str(uf.get("unit_name", "")).strip().upper()
            if not u_name:
                raise HTTPException(status_code=400, detail="Todas las unidades deben tener un nombre válido.")
            if u_name in seen_units:
                raise HTTPException(status_code=400, detail=f"La unidad '{u_name}' está duplicada en este producto.")
            seen_units.add(u_name)

            is_b = bool(uf.get("is_base"))
            u_factor = 1.0 if is_b else round(float(uf.get("factor", 1.0)), 4)
            if u_factor in seen_factors:
                raise HTTPException(
                    status_code=400,
                    detail=f"El factor equivalente ({u_factor}) está repetido. Cada unidad debe tener un factor de conversión único."
                )
            seen_factors.add(u_factor)

        for idx, uf in enumerate(unit_factors_data):
            u_name = str(uf.get("unit_name", "UNIDAD")).strip().upper()
            is_b = bool(uf.get("is_base")) if has_base else (idx == 0)
            u_factor = 1.0 if is_b else float(uf.get("factor", 1.0))
            u_price = float(uf.get("price", 0.0))

            db.add(ProductUnitFactor(
                product_id=product.id,
                unit_name=u_name,
                factor=u_factor,
                price=u_price,
                cost_price=float(uf.get("cost_price", 0.0)),
                sku=uf.get("sku"),
                is_base=is_b,
                for_sale=bool(uf.get("for_sale", True)),
                for_purchase=bool(uf.get("for_purchase", True)),
                is_active=bool(uf.get("is_active", True)),
                sort_order=idx,
            ))
    else:
        # Default Base Unit Factor
        db.add(ProductUnitFactor(
            product_id=product.id,
            unit_name=product.unit_name or "UNIDAD",
            factor=1.0,
            price=0.0,
            cost_price=0.0,
            is_base=True,
            for_sale=True,
            for_purchase=True,
            is_active=True,
        ))

    db.commit()
    db.refresh(product)
    return {"success": True, "data": product_to_dict(product), "message": "Producto creado correctamente"}


@router.get("/{product_id}")
def read_product(product_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    p = db.query(Product).filter(Product.id == product_id, Product.company_id == current_user.company_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"success": True, "data": product_to_dict(p)}


@router.put("/{product_id}")
def update_product(product_id: int, body: dict, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    p = db.query(Product).filter(Product.id == product_id, Product.company_id == current_user.company_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    fields = ["name", "description", "sku", "brand_id", "brand_name",
              "previous_price", "max_per_order", "category_id", "is_active", "is_featured",
              "show_in_store", "allow_unit_selection", "sort_order"]

    for field in fields:
        if field in body:
            val = body[field]
            if field in ["previous_price"] and val is not None:
                val = float(val) if str(val).strip() != "" else None
            elif field in ["max_per_order", "sort_order", "category_id", "brand_id"] and val is not None:
                val = int(val) if str(val).strip() != "" else None
            elif field in ["is_active", "is_featured", "show_in_store", "allow_unit_selection"] and val is not None:
                val = bool(val)
            setattr(p, field, val)

    # If unit factors list is provided
    if "unit_factors" in body and isinstance(body["unit_factors"], list):
        unit_factors_data = body["unit_factors"]
        if len(unit_factors_data) > 0:
            seen_units = set()
            seen_factors = set()

            # Validate duplicates first
            for uf in unit_factors_data:
                u_name = str(uf.get("unit_name", "")).strip().upper()
                if not u_name:
                    raise HTTPException(status_code=400, detail="Todas las unidades deben tener un nombre válido.")
                if u_name in seen_units:
                    raise HTTPException(status_code=400, detail=f"La unidad '{u_name}' está duplicada en este producto.")
                seen_units.add(u_name)

                is_b = bool(uf.get("is_base"))
                u_factor = 1.0 if is_b else round(float(uf.get("factor", 1.0)), 4)
                if u_factor in seen_factors:
                    raise HTTPException(
                        status_code=400,
                        detail=f"El factor equivalente ({u_factor}) está repetido. Cada unidad debe tener un factor de conversión único."
                    )
                seen_factors.add(u_factor)

            # Delete old factors
            db.query(ProductUnitFactor).filter(ProductUnitFactor.product_id == p.id).delete()

            has_base = any(bool(uf.get("is_base")) for uf in unit_factors_data)
            base_unit_name = p.unit_name or "UNIDAD"
            base_price = p.price or 0.0

            for idx, uf in enumerate(unit_factors_data):
                u_name = str(uf.get("unit_name", "UNIDAD")).strip().upper()
                is_b = bool(uf.get("is_base")) if has_base else (idx == 0)
                u_factor = 1.0 if is_b else float(uf.get("factor", 1.0))
                u_price = float(uf.get("price", 0.0))

                if is_b:
                    base_unit_name = u_name
                    base_price = u_price

                db.add(ProductUnitFactor(
                    product_id=p.id,
                    unit_name=u_name,
                    factor=u_factor,
                    price=u_price,
                    cost_price=float(uf.get("cost_price", 0.0)),
                    sku=uf.get("sku"),
                    is_base=is_b,
                    for_sale=bool(uf.get("for_sale", True)),
                    for_purchase=bool(uf.get("for_purchase", True)),
                    is_active=bool(uf.get("is_active", True)),
                    sort_order=idx,
                ))

            p.unit_name = base_unit_name
            p.price = base_price

    db.commit()
    db.refresh(p)
    return {"success": True, "data": product_to_dict(p), "message": "Producto actualizado"}


@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    p = db.query(Product).filter(Product.id == product_id, Product.company_id == current_user.company_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    db.delete(p)
    db.commit()
    return {"success": True, "message": "Producto eliminado"}


# ===== Multi-Unit Factors CRUD =====

@router.post("/{product_id}/unit-factors")
def create_unit_factor(product_id: int, body: dict, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    p = db.query(Product).filter(Product.id == product_id, Product.company_id == current_user.company_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    unit_name = body.get("unit_name", "").strip().upper()
    if not unit_name:
        raise HTTPException(status_code=400, detail="El nombre de la unidad es obligatorio.")

    is_base = bool(body.get("is_base", False))
    factor = 1.0 if is_base else float(body.get("factor", 1.0))
    if factor <= 0:
        raise HTTPException(status_code=400, detail="El factor equivalente debe ser mayor a 0.")

    # Check for existing factors on this product
    existing_factors = db.query(ProductUnitFactor).filter(ProductUnitFactor.product_id == product_id).all()

    for ef in existing_factors:
        if (ef.unit_name or "").strip().upper() == unit_name:
            raise HTTPException(status_code=400, detail=f"La unidad '{unit_name}' ya existe en este producto. No se pueden repetir nombres.")
        if round(ef.factor or 1.0, 4) == round(factor, 4):
            raise HTTPException(status_code=400, detail=f"El factor equivalente ({factor}) ya existe para la unidad '{ef.unit_name}'. No se permiten factores repetidos.")

    if is_base:
        db.query(ProductUnitFactor).filter(ProductUnitFactor.product_id == product_id).update({"is_base": False})

    cost = float(body.get("cost_price", p.cost_price or 0.0))
    raw_price = body.get("price")
    if raw_price is not None and str(raw_price).strip() != "":
        price = float(raw_price)
    else:
        price = round(cost * factor, 2)

    for_sale = bool(body.get("for_sale", True))
    for_purchase = bool(body.get("for_purchase", True))

    uf = ProductUnitFactor(
        product_id=product_id,
        unit_name=unit_name,
        factor=factor,
        price=price if for_sale else 0.0,
        cost_price=cost,
        sku=body.get("sku", None),
        is_base=is_base,
        for_sale=for_sale,
        for_purchase=for_purchase,
        is_active=bool(body.get("is_active", True)),
    )
    db.add(uf)

    if is_base:
        p.unit_name = unit_name
        p.price = price

    db.commit()
    db.refresh(uf)
    return {"success": True, "data": {"id": uf.id, "unit_name": uf.unit_name, "factor": uf.factor, "price": uf.price, "for_sale": uf.for_sale, "for_purchase": uf.for_purchase, "is_base": uf.is_base}}


@router.put("/{product_id}/unit-factors/{uf_id}")
def update_unit_factor(product_id: int, uf_id: int, body: dict, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    uf = db.query(ProductUnitFactor).filter(ProductUnitFactor.id == uf_id, ProductUnitFactor.product_id == product_id).first()
    if not uf:
        raise HTTPException(status_code=404, detail="Factor de unidad no encontrado")

    p = db.query(Product).filter(Product.id == product_id, Product.company_id == current_user.company_id).first()

    # If unit name is being updated, check duplicates
    if "unit_name" in body:
        new_name = str(body["unit_name"]).strip().upper()
        if not new_name:
            raise HTTPException(status_code=400, detail="El nombre de la unidad es obligatorio.")
        dup_name = db.query(ProductUnitFactor).filter(
            ProductUnitFactor.product_id == product_id,
            ProductUnitFactor.id != uf_id,
            func.upper(ProductUnitFactor.unit_name) == new_name
        ).first()
        if dup_name:
            raise HTTPException(status_code=400, detail=f"La unidad '{new_name}' ya existe en este producto.")
        uf.unit_name = new_name

    # If factor is being updated, check duplicates
    if "factor" in body:
        new_factor = float(body["factor"])
        if new_factor <= 0:
            raise HTTPException(status_code=400, detail="El factor equivalente debe ser mayor a 0.")
        dup_factor = db.query(ProductUnitFactor).filter(
            ProductUnitFactor.product_id == product_id,
            ProductUnitFactor.id != uf_id,
            ProductUnitFactor.factor == new_factor
        ).first()
        if dup_factor:
            raise HTTPException(status_code=400, detail=f"El factor equivalente ({new_factor}) ya existe para '{dup_factor.unit_name}'.")
        uf.factor = new_factor

    for field in ["price", "cost_price", "sku", "is_base", "for_sale", "for_purchase", "is_active"]:
        if field in body and body[field] is not None:
            val = body[field]
            if field in ["price", "cost_price"]:
                val = float(val)
            elif field in ["is_base", "for_sale", "for_purchase", "is_active"]:
                val = bool(val)
            setattr(uf, field, val)

    if uf.is_base:
        uf.factor = 1.0
        db.query(ProductUnitFactor).filter(
            ProductUnitFactor.product_id == product_id,
            ProductUnitFactor.id != uf_id
        ).update({"is_base": False})
        if p:
            p.unit_name = uf.unit_name
            p.price = uf.price
            p.cost_price = uf.cost_price

    db.commit()
    return {"success": True, "message": "Factor actualizado correctamente"}


@router.delete("/{product_id}/unit-factors/{uf_id}")
def delete_unit_factor(product_id: int, uf_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    uf = db.query(ProductUnitFactor).filter(ProductUnitFactor.id == uf_id, ProductUnitFactor.product_id == product_id).first()
    if not uf:
        raise HTTPException(status_code=404, detail="Factor de unidad no encontrado")

    count = db.query(ProductUnitFactor).filter(ProductUnitFactor.product_id == product_id).count()
    if count <= 1:
        raise HTTPException(status_code=400, detail="No puedes eliminar la única presentación del producto.")

    db.delete(uf)
    db.commit()
    return {"success": True, "message": "Factor eliminado"}


# ===== Images =====

@router.post("/{product_id}/images")
async def upload_image(
    product_id: int,
    file: UploadFile = File(...),
    is_primary: bool = Form(False),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    from app.services.storage_service import upload_image as storage_upload

    p = db.query(Product).filter(Product.id == product_id, Product.company_id == current_user.company_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Tipo de archivo no permitido: {ext}")

    file_bytes = await file.read()
    url = storage_upload(file_bytes, file.filename or f"product{ext}", folder="chatya/products")

    if is_primary:
        db.query(ProductImage).filter(ProductImage.product_id == product_id).update({"is_primary": False})

    count = db.query(ProductImage).filter(ProductImage.product_id == product_id).count()

    image = ProductImage(
        product_id=product_id,
        url=url,
        alt_text=p.name,
        is_primary=is_primary or count == 0,
        sort_order=count,
    )
    db.add(image)
    db.commit()
    db.refresh(image)

    return {
        "success": True,
        "data": {"id": image.id, "url": url, "is_primary": image.is_primary},
        "message": "Imagen subida correctamente",
    }


@router.delete("/{product_id}/images/{image_id}")
def delete_image(product_id: int, image_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    from app.services.storage_service import delete_image as storage_delete

    image = db.query(ProductImage).filter(
        ProductImage.id == image_id, ProductImage.product_id == product_id
    ).first()
    if not image:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")

    storage_delete(image.url)

    was_primary = image.is_primary
    db.delete(image)
    db.commit()

    if was_primary:
        next_img = db.query(ProductImage).filter(ProductImage.product_id == product_id).first()
        if next_img:
            next_img.is_primary = True
            db.commit()

    return {"success": True, "message": "Imagen eliminada"}


@router.put("/{product_id}/images/{image_id}/primary")
def set_primary_image(product_id: int, image_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    db.query(ProductImage).filter(ProductImage.product_id == product_id).update({"is_primary": False})
    image = db.query(ProductImage).filter(
        ProductImage.id == image_id, ProductImage.product_id == product_id
    ).first()
    if not image:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    image.is_primary = True
    db.commit()
    return {"success": True, "message": "Imagen principal actualizada"}
