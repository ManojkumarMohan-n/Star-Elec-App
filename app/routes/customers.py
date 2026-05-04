"""Customers Routes"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional

from app.db.database import get_db
from app.models.user import User, Customer
from app.schemas.schemas import CustomerCreate, CustomerOut, PaginatedResponse
from app.core.security import get_current_user

router = APIRouter()

@router.get("", response_model=PaginatedResponse)
async def list_customers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    query = db.query(Customer)
    if search:
        query = query.filter(or_(
            Customer.name.ilike(f"%{search}%"),
            Customer.phone.ilike(f"%{search}%"),
            Customer.email.ilike(f"%{search}%"),
        ))
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return {"items": items, "total": total, "page": page,
            "page_size": page_size, "total_pages": (total + page_size - 1) // page_size}

@router.post("", response_model=CustomerOut, status_code=201)
async def create_customer(data: CustomerCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    customer = Customer(**data.dict())
    db.add(customer); db.commit(); db.refresh(customer)
    return customer

@router.get("/{customer_id}", response_model=CustomerOut)
async def get_customer(customer_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c: raise HTTPException(404, "Customer not found")
    return c
