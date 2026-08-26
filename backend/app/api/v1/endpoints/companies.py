from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.deps import get_current_admin_user
from app.models.company import Company
from app.schemas.company import CompanyCreate, CompanyUpdate, CompanyOut

router = APIRouter()

@router.get("/", response_model=List[CompanyOut])
def read_companies(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user = Depends(get_current_admin_user)):
    companies = db.query(Company).offset(skip).limit(limit).all()
    return companies

@router.post("/", response_model=CompanyOut)
def create_company(company: CompanyCreate, db: Session = Depends(get_db), current_user = Depends(get_current_admin_user)):
    db_company = Company(**company.model_dump())
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company

@router.get("/{id}", response_model=CompanyOut)
def read_company(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_admin_user)):
    company = db.query(Company).filter(Company.id == id).first()
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return company

@router.put("/{id}", response_model=CompanyOut)
def update_company(id: int, company_in: CompanyUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_admin_user)):
    company = db.query(Company).filter(Company.id == id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    update_data = company_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(company, key, value)
        
    db.commit()
    db.refresh(company)
    return company

@router.delete("/{id}")
def delete_company(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_admin_user)):
    company = db.query(Company).filter(Company.id == id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    db.delete(company)
    db.commit()
    return {"message": "Company deleted successfully"}
