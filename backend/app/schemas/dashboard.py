from pydantic import BaseModel
from typing import List

class DashboardSummary(BaseModel):
    today_sales: float
    month_sales: float
    pending_orders: int
    total_customers: int

class TopProduct(BaseModel):
    name: str
    quantity_sold: int

class SalesChart(BaseModel):
    date: str
    sales: float

class DashboardOut(BaseModel):
    summary: DashboardSummary
    top_products: List[TopProduct]
    sales_chart: List[SalesChart]
    recent_orders: List[dict] # Simple dict for simplicity here
