import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
import app.models
from app.models.company import Company
from app.models.user import User
from app.core.security import get_password_hash

db: Session = SessionLocal()

try:
    company = db.query(Company).filter(Company.slug == "demo").first()
    if not company:
        company = Company(
            name="Demo Burger & Más",
            slug="demo",
            phone_whatsapp="51999999999",
            is_active=True,
        )
        db.add(company)
        db.flush()

    users_to_ensure = [
        {
            "email": "admin@chatya.com",
            "full_name": "Administrador General (ADM)",
            "role": "admin",
            "password": "chatya123",
        },
        {
            "email": "ventas@chatya.com",
            "full_name": "Agente de Ventas",
            "role": "ventas",
            "password": "ventas123",
        },
        {
            "email": "logistica@chatya.com",
            "full_name": "Encargado de Logística",
            "role": "logistica",
            "password": "logistica123",
        },
    ]

    for u in users_to_ensure:
        existing = db.query(User).filter(User.email == u["email"]).first()
        if existing:
            existing.role = u["role"]
            existing.full_name = u["full_name"]
            existing.hashed_password = get_password_hash(u["password"])
            existing.company_id = company.id
            existing.is_active = True
            print(f"🔄 Usuario actualizado: {u['email']} -> Rol: {u['role']}")
        else:
            new_u = User(
                company_id=company.id,
                email=u["email"],
                full_name=u["full_name"],
                role=u["role"],
                hashed_password=get_password_hash(u["password"]),
                is_active=True,
            )
            db.add(new_u)
            print(f"➕ Usuario creado: {u['email']} -> Rol: {u['role']}")

    db.commit()
    print("\n✅ Los 3 perfiles (admin, ventas, logistica) han sido configurados correctamente.")
except Exception as e:
    db.rollback()
    print("❌ Error:", e)
finally:
    db.close()
