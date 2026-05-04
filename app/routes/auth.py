"""
Auth Routes - Login, logout, register, profile management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.schemas.schemas import LoginRequest, TokenResponse, UserCreate, UserOut, UserUpdate
from app.core.security import (
    verify_password, get_password_hash, create_access_token,
    get_current_user, get_current_admin
)

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token."""
    user = db.query(User).filter(User.email == data.email, User.is_active == True).first()
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post("/register", response_model=UserOut, status_code=201)
async def register(
    data: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)   # Only admins can create users
):
    """Register a new user (Admin only)."""
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=data.name,
        email=data.email,
        phone=data.phone,
        password=get_password_hash(data.password),
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserOut)
async def get_profile(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return current_user


@router.put("/me", response_model=UserOut)
async def update_profile(
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user profile."""
    for field, value in data.dict(exclude_unset=True).items():
        if field == "role" and current_user.role.value != "admin":
            continue  # Staff cannot change their own role
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/users", response_model=list[UserOut])
async def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """List all users (Admin only)."""
    return db.query(User).all()


@router.post("/change-password")
async def change_password(
    old_password: str,
    new_password: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Change current user's password."""
    if not verify_password(old_password, current_user.password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    current_user.password = get_password_hash(new_password)
    db.commit()
    return {"message": "Password updated successfully"}
