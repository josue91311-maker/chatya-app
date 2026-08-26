from pydantic import BaseModel
from typing import Optional

class CompanyBase(BaseModel):
    name: str
    slug: str
    primary_color: Optional[str] = "#7C3AED"
    secondary_color: Optional[str] = "#10FFAB"
    accent_color: Optional[str] = "#10FFAB"
    phone_whatsapp: str
    currency: Optional[str] = "PEN"
    currency_symbol: Optional[str] = "S/"
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    business_hours: Optional[str] = None

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(CompanyBase):
    pass

class CompanyOut(CompanyBase):
    id: int
    logo_url: Optional[str] = None
    is_active: bool

    model_config = {"from_attributes": True}
