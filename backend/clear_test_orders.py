import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.core.database import SessionLocal
import app.models
from app.models.order import Order, OrderItem, OrderStatusHistory
from app.models.inventory import InventoryMovement
from app.models.customer import Customer
from app.models.product import Product

db = SessionLocal()

try:
    orders = db.query(Order).all()
    print(f"Borrando {len(orders)} pedidos de prueba...")

    # Return stock to products for all test order items
    for order in orders:
        for item in (order.items or []):
            if item.product_id:
                p = db.query(Product).filter(Product.id == item.product_id).first()
                if p:
                    p.stock = (p.stock or 0) + (item.quantity or 0)

    # Delete order status histories, order items, and orders
    db.query(OrderStatusHistory).delete()
    db.query(OrderItem).delete()
    db.query(Order).delete()
    
    # Clean test inventory movements
    db.query(InventoryMovement).filter(InventoryMovement.reason.like('%Tienda Web%')).delete(synchronize_session=False)

    # Reset customer statistics
    customers = db.query(Customer).all()
    for c in customers:
        c.total_orders = 0
        c.total_spent = 0.0

    # Reset sqlite sequence for orders and order_items
    try:
        db.execute(text("DELETE FROM sqlite_sequence WHERE name IN ('orders', 'order_items', 'order_status_history')"))
    except Exception:
        pass

    db.commit()
    print("✅ ¡Todos los pedidos de prueba fueron eliminados exitosamente! La lista quedó en 0 y el stock fue restaurado.")
except Exception as e:
    db.rollback()
    print("❌ Error al limpiar pedidos:", e)
finally:
    db.close()
