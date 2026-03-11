from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from pydantic import ValidationError
from typing import Optional

# No hashlib needed!

import models, schemas, database
from sqlalchemy.orm import Session
import logging

# Setup logger
logger = logging.getLogger(__name__)

# --- Configuration ---
SECRET_KEY = "a_very_insecure_secret_key_please_change_me"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# --- 1. Password Hashing (THE FIX) ---
# We are now using "argon2" instead of "bcrypt".
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
# --- END OF FIX ---

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")


# --- Utility Functions (CLEANED UP) ---

def verify_password(plain_password, hashed_password):
    # No pre-hashing needed. Passlib handles it all.
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    # No pre-hashing needed.
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# --- Database Dependency ---
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- User-fetching Functions ---

def get_user(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()


def authenticate_user(db: Session, username: str, password: str):
    user = get_user(db, username)
    if not user:
        return False  # User doesn't exist

    # This will now use our new verify_password function
    if not verify_password(password, user.hashed_password):
        return False  # Password incorrect
    return user


# --- The "Get Current User" Dependency (CRITICAL) ---
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except (JWTError, ValidationError) as e:
        logger.warning(f"JWT/Token validation error: {e}")
        raise credentials_exception

    user = get_user(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return schemas.UserInDB.from_orm(user)