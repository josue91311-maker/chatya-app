from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class PromotionBase(BaseModel):
    name: str
    description: Optional[str] = None
    promotion_type: str
    discount_value: Optional[float] = None
    product_ids: Optional[str] = None
    combo_products: Optional[str] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    active_days: Optional[str] = None
    active_from_time: Optional[str] = None
    active_to_time: Optional[str] = None
    is_active: bool = True

class PromotionCreate(PromotionBase):
    pass

class PromotionUpdate(PromotionBase):
    pass

class PromotionOut(PromotionBase):
    id: int
    company_id: int

    model_config = {"from_attributes": True}
