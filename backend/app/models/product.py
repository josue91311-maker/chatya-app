from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    brand_id = Column(Integer, ForeignKey("brands.id"), nullable=True)

    name = Column(String)
    slug = Column(String, index=True)
    description = Column(String, nullable=True)
    sku = Column(String, nullable=True)
    internal_code = Column(String, nullable=True)
    brand_name = Column(String, nullable=True)

    # Base Unit & Primary Price
    unit_name = Column(String, default="Unidad")
    cost_price = Column(Float, default=0.0)
    factor = Column(Float, default=1.0)
    price = Column(Float, default=0.0)
    previous_price = Column(Float, nullable=True)

    # Physical inventory count
    stock = Column(Integer, default=0)
    min_stock = Column(Integer, default=0)
    max_per_order = Column(Integer, nullable=True)

    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    show_in_store = Column(Boolean, default=False)
    allow_unit_selection = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="products")
    category = relationship("Category", back_populates="products")
    brand = relationship("Brand", back_populates="products")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")
    unit_factors = relationship("ProductUnitFactor", back_populates="product", cascade="all, delete-orphan")
    inventory_movements = relationship("InventoryMovement", back_populates="product", cascade="all, delete-orphan")


class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    url = Column(String)
    alt_text = Column(String, nullable=True)
    sort_order = Column(Integer, default=0)
    is_primary = Column(Boolean, default=False)

    product = relationship("Product", back_populates="images")


class ProductUnitFactor(Base):
    __tablename__ = "product_unit_factors"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))

    unit_name = Column(String)  # ej. "UNIDAD", "CAJA x12", "DOCENA"
    factor = Column(Float, default=1.0)  # ej. 12.0 for 12 units
    price = Column(Float, default=0.0)  # Price for this presentation
    cost_price = Column(Float, default=0.0)
    sku = Column(String, nullable=True)

    is_base = Column(Boolean, default=False)
    for_sale = Column(Boolean, default=True)
    for_purchase = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)

    product = relationship("Product", back_populates="unit_factors")
