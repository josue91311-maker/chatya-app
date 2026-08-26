from pydantic import BaseModel
from typing import Optional, List

class CompanyConfigBase(BaseModel):
    delivery_enabled: bool = True
    pickup_enabled: bool = True
    dine_in_enabled: bool = False
    tax_enabled: bool = False
    tax_percentage: float = 18.0
    prices_include_tax: bool = True
    receipt_none: bool = True
    receipt_boleta: bool = False
    receipt_factura: bool = False
    hide_out_of_stock: bool = True
    show_out_of_stock_badge: bool = False
    min_order_amount: float = 0.0
    delivery_cost: float = 0.0
    free_delivery_from: Optional[float] = None
    estimated_delivery_minutes: int = 45
    welcome_message: Optional[str] = None
    store_description: Optional[str] = None

class CompanyConfigOut(CompanyConfigBase):
    company_id: int
    model_config = {"from_attributes": True}
