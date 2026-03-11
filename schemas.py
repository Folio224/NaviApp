from pydantic import BaseModel, EmailStr, ConfigDict # <-- IMPORT EmailStr
from typing import List, Optional

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# --- User Schemas ---
class UserBase(BaseModel):
    username: str
    email: EmailStr # <-- UPDATED from str to EmailStr for validation

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    id: int
    interests: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# --- NEW: Schema for updating email ---
class EmailUpdate(BaseModel):
    new_email: EmailStr

# --- API Request Schemas (from app.py) ---
class ChatRequest(BaseModel):
    userQuery: str
    systemPrompt: str

class BookRequest(BaseModel):
    userPrompt: str
    userInterests: List[str]
    systemPrompt: str

# --- Interests Schema ---
class InterestsUpdate(BaseModel):
    interests: List[str]