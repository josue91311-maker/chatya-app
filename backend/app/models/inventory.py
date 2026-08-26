from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    product_id = Column(Integer, ForeignKey("products.id"))

    movement_type = Column(String)  # ENTRADA, SALIDA, AJUSTE, VENTA
    quantity = Column(Integer)
    previous_stock = Column(Integer)
    new_stock = Column(Integer)

    reason = Column(String, nullable=True)
    reference_code = Column(String, nullable=True)  # Order code or document reference
    user_name = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company")
    product = relationship("Product", back_populates="inventory_movements")
