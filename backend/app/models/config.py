from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class CompanyConfig(Base):
    __tablename__ = "company_configs"

    company_id = Column(Integer, ForeignKey("companies.id"), primary_key=True)

    delivery_enabled = Column(Boolean, default=True)
    pickup_enabled = Column(Boolean, default=True)
    dine_in_enabled = Column(Boolean, default=False)

    delivery_mode = Column(String, default="fixed")  # fixed, coordinate, district
    covered_districts = Column(String, nullable=True)  # JSON list of {name, cost}
    show_estimated_time = Column(Boolean, default=False)  # Hide delivery arrival time by default

    tax_enabled = Column(Boolean, default=False)
    tax_percentage = Column(Float, default=18.0)
    prices_include_tax = Column(Boolean, default=True)

    receipt_none = Column(Boolean, default=True)
    receipt_boleta = Column(Boolean, default=False)
    receipt_factura = Column(Boolean, default=False)

    hide_out_of_stock = Column(Boolean, default=True)
    show_out_of_stock_badge = Column(Boolean, default=False)

    min_order_amount = Column(Float, default=0.0)
    delivery_cost = Column(Float, default=0.0)
    free_delivery_from = Column(Float, nullable=True)

    estimated_delivery_minutes = Column(Integer, default=45)

    welcome_message = Column(String, nullable=True)
    store_description = Column(String, nullable=True)

    company = relationship("Company", back_populates="config")

class OrderStatus(Base):
    __tablename__ = "order_statuses"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    name = Column(String)
    color = Column(String)
    sort_order = Column(Integer, default=0)
    is_default = Column(Boolean, default=False)
    is_final = Column(Boolean, default=False)

    company = relationship("Company", back_populates="order_statuses")

class PaymentMethod(Base):
    __tablename__ = "payment_methods"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    name = Column(String)
    type = Column(String)
    instructions = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)

    company = relationship("Company", back_populates="payment_methods")
