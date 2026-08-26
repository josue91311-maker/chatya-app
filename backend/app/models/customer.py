from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    
    full_name = Column(String)
    whatsapp_number = Column(String)
    email = Column(String, nullable=True)
    
    total_orders = Column(Integer, default=0)
    total_spent = Column(Float, default=0.0)
    
    last_order_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String, nullable=True)

    company = relationship("Company", back_populates="customers")
    orders = relationship("Order", back_populates="customer")
