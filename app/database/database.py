"""
Database Configuration - SQLAlchemy engine, session, and base model
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Create engine with connection pooling
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,      # Check connection health before use
    pool_size=10,            # Connection pool size
    max_overflow=20,         # Extra connections beyond pool_size
    pool_recycle=3600,       # Recycle connections after 1 hour
    echo=settings.DEBUG,     # Log SQL queries in debug mode
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all ORM models
Base = declarative_base()


def get_db():
    """FastAPI dependency: yields a database session, closes after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
