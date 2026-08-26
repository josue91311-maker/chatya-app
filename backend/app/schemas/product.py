from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ProductImageOut(BaseModel):
    id: int
    url: str
    alt_text: Optional[str]
    sort_order: int
    is_primary: bool
    model_config = {"from_attributes": True}

class ProductBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    sku: Optional[str] = None
    internal_code: Optional[str] = None
    price: float
    previous_price: Optional[float] = None
    stock: int = 0
    min_stock: int = 0
    max_per_order: Optional[int] = None
    is_active: bool = True
    is_featured: bool = False
    show_in_store: bool = True
    sort_order: int = 0
    category_id: int

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    category_id: Optional[int] = None
    is_active: Optional[bool] = None

class ProductOut(ProductBase):
    id: int
    company_id: int
    created_at: datetime
    images: List[ProductImageOut] = []

    model_config = {"from_attributes": True}
