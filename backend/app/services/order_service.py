from sqlalchemy.orm import Session
from app.models.order import Order
from app.schemas.order import OrderCreate

def create_order(db: Session, order: OrderCreate, company_id: int):
    # In a real scenario, this would have a lot of validation and stock decrement logic
    pass
