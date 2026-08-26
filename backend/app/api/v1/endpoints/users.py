from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_admin
from app.core.security import get_password_hash
from app.models.user import User
from app.models.company import Company

router = APIRouter()

VALID_ROLES = ["admin", "ventas", "logistica"]

def user_to_dict(u: User) -> dict:
    return {
        "id": u.id,
        "company_id": u.company_id,
        "email": u.email,
        "full_name": u.full_name or "",
        "role": u.role or "ventas",
        "is_active": u.is_active,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }


@router.get("/")
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """List all users of the current company (Admin only)."""
    users = (
        db.query(User)
        .filter(User.company_id == current_user.company_id)
        .order_by(User.created_at.desc())
        .all()
    )
    return {
        "success": True,
        "data": [user_to_dict(u) for u in users],
        "total": len(users),
    }


@router.post("/")
def create_user(
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create a new user with specific role (Admin only)."""
    email = str(body.get("email", "")).strip().lower()
    password = str(body.get("password", "")).strip()
    full_name = str(body.get("full_name", "")).strip()
    role = str(body.get("role", "ventas")).strip().lower()

    if not email:
        raise HTTPException(status_code=400, detail="El correo electrónico es obligatorio")
    if not password or len(password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
    if not full_name:
        raise HTTPException(status_code=400, detail="El nombre completo es obligatorio")
    if role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Rol inválido. Opciones: {', '.join(VALID_ROLES)}")

    # Check email duplicate
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Ya existe un usuario con el correo '{email}'")

    new_user = User(
        company_id=current_user.company_id,
        email=email,
        full_name=full_name,
        role=role,
        hashed_password=get_password_hash(password),
        is_active=bool(body.get("is_active", True)),
        created_at=datetime.utcnow(),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "success": True,
        "data": user_to_dict(new_user),
        "message": f"Usuario {full_name} ({role.upper()}) creado exitosamente",
    }


@router.put("/{user_id}")
def update_user(
    user_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update an existing user's details, role, or reset password (Admin only)."""
    user = (
        db.query(User)
        .filter(User.id == user_id, User.company_id == current_user.company_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if "email" in body:
        new_email = str(body["email"]).strip().lower()
        if new_email and new_email != user.email:
            existing = db.query(User).filter(User.email == new_email, User.id != user_id).first()
            if existing:
                raise HTTPException(status_code=400, detail=f"El correo '{new_email}' ya está registrado por otro usuario")
            user.email = new_email

    if "full_name" in body:
        user.full_name = str(body["full_name"]).strip()

    if "role" in body:
        new_role = str(body["role"]).strip().lower()
        if new_role not in VALID_ROLES:
            raise HTTPException(status_code=400, detail=f"Rol inválido. Opciones: {', '.join(VALID_ROLES)}")
        # Prevent demoting the only admin
        if user.id == current_user.id and new_role != "admin":
            raise HTTPException(status_code=400, detail="No puedes quitarte el rol de Administrador a ti mismo")
        user.role = new_role

    if "is_active" in body:
        new_active = bool(body["is_active"])
        if user.id == current_user.id and not new_active:
            raise HTTPException(status_code=400, detail="No puedes desactivar tu propia cuenta")
        user.is_active = new_active

    if "password" in body and str(body["password"]).strip():
        pwd = str(body["password"]).strip()
        if len(pwd) < 6:
            raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 6 caracteres")
        user.hashed_password = get_password_hash(pwd)

    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "data": user_to_dict(user),
        "message": f"Usuario {user.full_name} actualizado correctamente",
    }


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Delete a user (Admin only)."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta de Administrador")

    user = (
        db.query(User)
        .filter(User.id == user_id, User.company_id == current_user.company_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    db.delete(user)
    db.commit()

    return {
        "success": True,
        "message": f"Usuario '{user.full_name}' eliminado correctamente",
    }
