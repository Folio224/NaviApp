from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. Define the database URL
DATABASE_URL = "sqlite:///./navimind.db"

# 2. Create the database "engine"
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

# 3. Create a "Session" class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 4. Create a "Base" class
Base = declarative_base()

# 5. A helper function to create all tables
def create_db_and_tables():
    """
    This function will be called by app.py on startup
    to create the database file and all tables.
    """
    # This import is crucial! It tells SQLAlchemy to find all
    # classes that inherit from Base (like User, GeneratedBook)
    # before it tries to create the tables.
    import models
    Base.metadata.create_all(bind=engine)