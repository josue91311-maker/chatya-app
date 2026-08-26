from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    slug = Column(String, unique=True, index=True)
    logo_url = Column(String, nullable=True)
    
    primary_color = Column(String, default="#7C3AED")
    secondary_color = Column(String, default="#10FFAB")
    accent_color = Column(String, default="#10FFAB")
    
    phone_whatsapp = Column(String)
    currency = Column(String, default="PEN")
    currency_symbol = Column(String, default="S/")
    
    ruc = Column(String, nullable=True)
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    country = Column(String, nullable=True)
    
    business_hours = Column(String, nullable=True) # JSON string for SQLite compat
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="company")
    config = relationship("CompanyConfig", back_populates="company", uselist=False)
    categories = relationship("Category", back_populates="company")
    products = relationship("Product", back_populates="company")
    promotions = relationship("Promotion", back_populates="company")
    customers = relationship("Customer", back_populates="company")
    orders = relationship("Order", back_populates="company")
    order_statuses = relationship("OrderStatus", back_populates="company")
    payment_methods = relationship("PaymentMethod", back_populates="company")
    brands = relationship("Brand", back_populates="company")
