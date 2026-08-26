from pydantic import BaseModel
from typing import Optional, List, Any, Union
from datetime import datetime
import json

class OrderItemBase(BaseModel):
    product_id: Optional[int] = None
    product_name: Optional[str] = "Producto"
    product_sku: Optional[str] = None
    quantity: int = 1
    unit_price: float = 0.0
    discount_amount: float = 0.0
    total_price: Optional[float] = None
    promotion_applied: Optional[str] = None

class OrderItemOut(OrderItemBase):
    id: int
    order_id: int
    model_config = {"from_attributes": True}

class OrderBase(BaseModel):
    customer_name: str = "CLIENTES VARIOS"
    whatsapp_number: str = "00000000000"
    delivery_method: str = "delivery"
    payment_method: str = "Efectivo contra entrega"
    receipt_type: str = "none"
    receipt_data: Optional[Union[dict, str, Any]] = None
    delivery_address: Optional[str] = None
    delivery_reference: Optional[str] = None
    delivery_district: Optional[str] = None
    delivery_cost: Optional[float] = 0.0
    notes: Optional[str] = None
    items: List[OrderItemBase] = []

class OrderCreate(OrderBase):
    pass

class OrderOut(BaseModel):
    id: int
    order_code: str
    tracking_token: str
    status: str
    customer_name: str
    whatsapp_number: str
    delivery_method: str
    payment_method: str
    receipt_type: Optional[str] = "none"
    receipt_data: Optional[str] = None
    invoice_number: Optional[str] = None
    delivery_address: Optional[str] = None
    delivery_district: Optional[str] = None
    delivery_reference: Optional[str] = None
    notes: Optional[str] = None
    subtotal: float
    discount_amount: float
    tax_amount: float = 0.0
    delivery_cost: float
    total: float
    created_at: datetime
    items: List[OrderItemOut]

    model_config = {"from_attributes": True}
