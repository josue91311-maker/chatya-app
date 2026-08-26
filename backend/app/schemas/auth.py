from pydantic import BaseModel
from typing import Optional

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class TokenData(BaseModel):
    sub: Optional[str] = None

class UserBase(BaseModel):
    email: str
    full_name: str
    role: str

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: int
    company_id: Optional[int] = None
    company_name: Optional[str] = None
    company_slug: Optional[str] = None
    is_active: bool

    model_config = {"from_attributes": True}
