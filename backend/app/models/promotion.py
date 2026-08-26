from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base

class Promotion(Base):
    __tablename__ = "promotions"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    
    name = Column(String)
    description = Column(String, nullable=True)
    promotion_type = Column(String) # 2x1, 3x2, percentage, fixed, combo
    
    discount_value = Column(Float, nullable=True)
    product_ids = Column(String, nullable=True) # JSON string
    combo_products = Column(String, nullable=True) # JSON string
    
    starts_at = Column(DateTime, nullable=True)
    ends_at = Column(DateTime, nullable=True)
    
    active_days = Column(String, nullable=True) # JSON string like "[0,1,2]"
    active_from_time = Column(String, nullable=True) # "09:00"
    active_to_time = Column(String, nullable=True) # "18:00"
    
    is_active = Column(Boolean, default=True)

    company = relationship("Company", back_populates="promotions")
