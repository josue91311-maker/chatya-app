from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    
    order_code = Column(String, index=True, unique=True)
    tracking_token = Column(String, default=lambda: str(uuid.uuid4()), unique=True, index=True)
    status = Column(String, default="pending")
    
    delivery_method = Column(String) # delivery, pickup, dine_in
    payment_method = Column(String)
    payment_percentage = Column(Float, nullable=True)
    
    receipt_type = Column(String, default="none")
    receipt_data = Column(String, nullable=True) # JSON string
    invoice_number = Column(String, nullable=True) # F001-0000123 / B001-0000456
    
    subtotal = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    delivery_cost = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    
    customer_name = Column(String)
    whatsapp_number = Column(String)
    ip_address = Column(String, nullable=True)
    
    delivery_address = Column(String, nullable=True)
    delivery_reference = Column(String, nullable=True)
    delivery_district = Column(String, nullable=True)
    delivery_lat = Column(Float, nullable=True)
    delivery_lng = Column(Float, nullable=True)
    
    notes = Column(String, nullable=True)
    estimated_delivery_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="orders")
    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    history = relationship("OrderStatusHistory", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    
    product_name = Column(String)
    product_sku = Column(String, nullable=True)
    
    quantity = Column(Integer)
    unit_price = Column(Float)
    discount_amount = Column(Float, default=0.0)
    total_price = Column(Float)
    
    promotion_applied = Column(String, nullable=True) # JSON string

    order = relationship("Order", back_populates="items")

class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    status = Column(String)
    note = Column(String, nullable=True)
    changed_at = Column(DateTime, default=datetime.utcnow)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    order = relationship("Order", back_populates="history")
