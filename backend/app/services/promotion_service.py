from sqlalchemy.orm import Session
from app.models.promotion import Promotion
from app.schemas.promotion import PromotionCreate

def create_promotion(db: Session, promotion: PromotionCreate, company_id: int):
    db_promotion = Promotion(**promotion.model_dump(), company_id=company_id)
    db.add(db_promotion)
    db.commit()
    db.refresh(db_promotion)
    return db_promotion
