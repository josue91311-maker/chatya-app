from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CustomerBase(BaseModel):
    full_name: str
    whatsapp_number: str
    email: Optional[str] = None

class CustomerOut(CustomerBase):
    id: int
    company_id: int
    total_orders: int
    total_spent: float
    last_order_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}
