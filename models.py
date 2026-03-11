from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base  # Import Base from our database.py file
from datetime import datetime


class User(Base):
    """
    This model will store your user's login information.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)

    # --- THIS IS THE FIX ---
    # Changed 'mail' to 'email' to match app.py and schemas.py
    email = Column(String, unique=True, index=True, nullable=False)

    hashed_password = Column(String, nullable=False)
    interests = Column(Text, nullable=True)

    # --- Relationships (with 'back_populates' corrected) ---
    books = relationship("GeneratedBook", back_populates="owner")
    summaries = relationship("SummarizedFile", back_populates="owner")


class GeneratedBook(Base):
    """
    This model will store the books a user creates.
    """
    __tablename__ = "generated_books"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    html_content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="books")


class SummarizedFile(Base):
    """
    This model will store a user's summarized files.
    """
    __tablename__ = "summarized_files"

    id = Column(Integer, primary_key=True, index=True)
    original_filename = Column(String, nullable=False)
    json_content = Column(Text, nullable=False)  # Store the JSON analysis as text
    created_at = Column(DateTime, default=datetime.utcnow)

    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="summaries")