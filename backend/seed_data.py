"""
ChatYa Seed Data — Demo company with real-looking products
Run: python seed_data.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
# Import ALL models to resolve SQLAlchemy relationships
import app.models  # noqa - triggers __init__.py imports
from app.models.company import Company
from app.models.config import CompanyConfig, OrderStatus, PaymentMethod
from app.models.user import User
from app.models.category import Category
from app.models.product import Product
from app.models.promotion import Promotion
from app.models.customer import Customer
from app.core.security import get_password_hash


def seed_db():
    print("🌱 ChatYa — Iniciando seed de base de datos...")
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # ===== Company =====
        if db.query(Company).filter(Company.slug == "demo").first():
            print("✅ Base de datos ya contiene datos. Saltando...")
            return

        company = Company(
            name="Demo Burger & Más",
            slug="demo",
            phone_whatsapp="51999999999",
            primary_color="#7C3AED",
            secondary_color="#5B21B6",
            accent_color="#10FFAB",
            currency="PEN",
            currency_symbol="S/",
            address="Av. Javier Prado 123",
            city="Lima",
            country="Perú",
            is_active=True,
        )
        db.add(company)
        db.flush()

        # ===== Config =====
        config = CompanyConfig(
            company_id=company.id,
            delivery_enabled=True,
            pickup_enabled=True,
            dine_in_enabled=True,
            delivery_cost=5.00,
            free_delivery_from=60.00,
            min_order_amount=15.00,
            estimated_delivery_minutes=35,
            tax_enabled=False,
            tax_percentage=18.0,
            prices_include_tax=True,
            receipt_none=True,
            receipt_boleta=True,
            receipt_factura=True,
            hide_out_of_stock=False,
            show_out_of_stock_badge=True,
            store_description="¡Hola! 👋 Bienvenido a Demo Burger & Más. Haz tu pedido y te lo llevamos en 35 minutos.",
            welcome_message="¡Las mejores hamburguesas artesanales de Lima! 🍔🔥",
        )
        db.add(config)
        db.flush()

        # ===== Admin User =====
        admin = User(
            company_id=company.id,
            email="admin@chatya.com",
            full_name="Administrador ChatYa",
            role="admin",
            hashed_password=get_password_hash("chatya123"),
            is_active=True,
        )
        db.add(admin)

        # ===== Categories =====
        cats_data = [
            ("🍔 Hamburguesas", "hamburguesas", 1),
            ("🍕 Pizzas",        "pizzas",        2),
            ("🥤 Bebidas",       "bebidas",        3),
            ("🍰 Postres",       "postres",        4),
            ("🎁 Combos",        "combos",         5),
        ]
        categories = {}
        for name, slug, order in cats_data:
            cat = Category(
                company_id=company.id,
                name=name,
                slug=slug,
                sort_order=order,
                is_active=True,
            )
            db.add(cat)
            db.flush()
            categories[slug] = cat

        # ===== Products =====
        products_data = [
            # Hamburguesas
            {
                "name": "Hamburguesa Clásica",
                "slug": "hamburguesa-clasica",
                "description": "Carne de res premium 120g, queso cheddar, lechuga fresca, tomate, cebolla y salsa especial.",
                "price": 18.90,
                "previous_price": None,
                "stock": 50,
                "category": "hamburguesas",
                "is_featured": True,
                "sort_order": 1,
            },
            {
                "name": "Double Smash Burger",
                "slug": "double-smash-burger",
                "description": "Doble carne aplastada 2x80g, doble queso american, pepinillos, cebolla caramelizada, salsa smash.",
                "price": 26.90,
                "previous_price": 32.00,
                "stock": 30,
                "category": "hamburguesas",
                "is_featured": True,
                "sort_order": 2,
            },
            {
                "name": "BBQ Bacon Burger",
                "slug": "bbq-bacon-burger",
                "description": "Carne de res 150g, tocino crocante, queso gouda, aros de cebolla, salsa BBQ artesanal.",
                "price": 24.90,
                "previous_price": None,
                "stock": 25,
                "category": "hamburguesas",
                "is_featured": False,
                "sort_order": 3,
            },
            {
                "name": "Papas con Cheddar",
                "slug": "papas-cheddar",
                "description": "Porción generosa de papas fritas crujientes bañadas en salsa cheddar caliente y tocino.",
                "price": 14.90,
                "previous_price": 18.00,
                "stock": 40,
                "category": "hamburguesas",
                "is_featured": False,
                "sort_order": 4,
            },
            # Pizzas
            {
                "name": "Pizza Pepperoni",
                "slug": "pizza-pepperoni",
                "description": "Masa artesanal delgada, salsa de tomate especial, mozzarella premium y abundante pepperoni.",
                "price": 34.90,
                "previous_price": None,
                "stock": 20,
                "category": "pizzas",
                "is_featured": True,
                "sort_order": 1,
            },
            {
                "name": "Pizza 4 Quesos",
                "slug": "pizza-4-quesos",
                "description": "Mozzarella, gorgonzola, parmesano y ricotta sobre base de tomate. ¡Irresistible!",
                "price": 38.90,
                "previous_price": None,
                "stock": 15,
                "category": "pizzas",
                "is_featured": False,
                "sort_order": 2,
            },
            # Bebidas
            {
                "name": "Coca Cola 500ml",
                "slug": "coca-cola-500ml",
                "description": "Coca Cola bien fría, presentación personal 500ml.",
                "price": 5.00,
                "previous_price": 6.00,
                "stock": 100,
                "category": "bebidas",
                "is_featured": False,
                "sort_order": 1,
            },
            {
                "name": "Limonada Frozen",
                "slug": "limonada-frozen",
                "description": "Limonada estilo slush con hielo picado, limón natural exprimido y toque de menta.",
                "price": 8.50,
                "previous_price": None,
                "stock": 50,
                "category": "bebidas",
                "is_featured": True,
                "sort_order": 2,
            },
            # Postres
            {
                "name": "Cheesecake de Maracuyá",
                "slug": "cheesecake-maracuya",
                "description": "Porción generosa de cheesecake NY cremoso con coulis de maracuyá fresco.",
                "price": 12.90,
                "previous_price": None,
                "stock": 20,
                "category": "postres",
                "is_featured": False,
                "sort_order": 1,
            },
            # Combos
            {
                "name": "Combo Familiar",
                "slug": "combo-familiar",
                "description": "2 Hamburguesas Clásicas + 2 Coca Cola 500ml + 1 Papas con Cheddar. ¡El favorito de la familia!",
                "price": 52.90,
                "previous_price": 65.00,
                "stock": 10,
                "category": "combos",
                "is_featured": True,
                "sort_order": 1,
            },
        ]

        for p in products_data:
            product = Product(
                company_id=company.id,
                category_id=categories[p["category"]].id,
                name=p["name"],
                slug=p["slug"],
                description=p["description"],
                price=p["price"],
                previous_price=p.get("previous_price"),
                stock=p["stock"],
                is_active=True,
                is_featured=p["is_featured"],
                show_in_store=True,
                sort_order=p["sort_order"],
            )
            db.add(product)

        # ===== Promotions =====
        promo1 = Promotion(
            company_id=company.id,
            name="2x1 Bebidas los Martes",
            description="Lleva 2 bebidas y paga solo 1 todos los martes.",
            promotion_type="2x1",
            is_active=True,
        )
        promo2 = Promotion(
            company_id=company.id,
            name="10% OFF en Combos",
            description="Descuento del 10% en todos los combos del menú.",
            promotion_type="percentage",
            discount_value=10.0,
            is_active=True,
        )
        db.add(promo1)
        db.add(promo2)

        # ===== Order Statuses =====
        statuses = [
            ("Pendiente",   "#FFB547", True,  False),
            ("En camino",   "#3B82F6", False, False),
            ("Entregado",   "#22C55E", False, False),
            ("Pagado",      "#7C3AED", False, True),
            ("Cancelado",   "#FF4D6D", False, True),
        ]
        for i, (name, color, is_default, is_final) in enumerate(statuses):
            status = OrderStatus(
                company_id=company.id,
                name=name,
                color=color,
                sort_order=i,
                is_default=is_default,
                is_final=is_final,
            )
            db.add(status)

        # ===== Payment Methods =====
        payments = [
            ("Yape / Plin",     "yape",             "Número Yape: 999-999-999", 1),
            ("Transferencia",   "bank_transfer",    "BCP: 123-456789-0-12", 2),
            ("Contra entrega",  "cash_on_delivery", "Pago al recibir el pedido", 3),
            ("50% Adelantado",  "partial",          "50% por Yape y 50% contra entrega", 4),
        ]
        for name, ptype, instructions, order in payments:
            pm = PaymentMethod(
                company_id=company.id,
                name=name,
                type=ptype,
                instructions=instructions,
                is_active=True,
                sort_order=order,
            )
            db.add(pm)

        # ===== Default Customer: CLIENTES VARIOS =====
        default_customer = Customer(
            company_id=company.id,
            full_name="CLIENTES VARIOS",
            whatsapp_number="00000000000",
            email=None,
            total_orders=0,
            total_spent=0,
            ip_address="0.0.0.0",
        )
        db.add(default_customer)

        db.commit()
        print("\n✅ ¡Seed completado exitosamente!")
        print("\n📋 Datos de acceso:")
        print("   🌐 Tienda Demo:    http://localhost:3000/demo")
        print("   🖥️  Portal Admin:   http://localhost:3000/admin")
        print("   📧 Email Admin:    admin@chatya.com")
        print("   🔐 Contraseña:     chatya123")
        print("   📖 API Docs:       http://localhost:8000/docs")
        print("\n🧪 Para probar sin WhatsApp:")
        print("   http://localhost:3000/demo?preview=true")

    except Exception as e:
        db.rollback()
        print(f"❌ Error durante el seed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_db()
