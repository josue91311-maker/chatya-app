from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    name = Column(String)
    slug = Column(String, index=True)
    description = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    company = relationship("Company", back_populates="categories")
    parent = relationship("Category", remote_side=[id])
    products = relationship("Product", back_populates="category")
