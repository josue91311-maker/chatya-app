import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
import app.models
from app.models.product import Product, ProductUnitFactor

db: Session = SessionLocal()

try:
    products = db.query(Product).all()
    created_count = 0
    for p in products:
        factors = db.query(ProductUnitFactor).filter(ProductUnitFactor.product_id == p.id).all()
        if not factors:
            # Create default base factor
            db.add(ProductUnitFactor(
                product_id=p.id,
                unit_name=p.unit_name or "UNIDAD",
                factor=1.0,
                cost_price=float(p.cost_price or 0.0),
                price=float(p.price or 0.0),
                is_base=True,
                for_sale=True,
                for_purchase=True,
                is_active=True,
                sort_order=0,
            ))
            created_count += 1
            print(f"➕ Creado factor base para producto: {p.name} (P. Venta: S/ {p.price})")

    db.commit()
    print(f"\n✅ Sincronización completada: {created_count} productos ahora tienen su factor base registrado.")
except Exception as e:
    db.rollback()
    print("❌ Error:", e)
finally:
    db.close()
