"""
Products Routes - Full CRUD for products, categories, and suppliers
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import Optional

from app.db.database import get_db
from app.models.user import User, Product, Category, Supplier
from app.schemas.schemas import (
    ProductCreate, ProductUpdate, ProductOut,
    CategoryCreate, CategoryOut,
    SupplierCreate, SupplierOut,
    PaginatedResponse
)
from app.core.security import get_current_user, get_current_admin
from app.core.config import settings

router = APIRouter()


# ─── Products ─────────────────────────────────────────────────────────────────

@router.get("", response_model=PaginatedResponse)
async def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    low_stock: Optional[bool] = None,
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """List products with search, filter and pagination."""
    query = db.query(Product)

    if is_active is not None:
        query = query.filter(Product.is_active == is_active)
    if search:
        query = query.filter(
            or_(
                Product.name.ilike(f"%{search}%"),
                Product.sku.ilike(f"%{search}%"),
                Product.barcode.ilike(f"%{search}%"),
            )
        )
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if low_stock:
        query = query.filter(Product.quantity <= Product.low_stock_level)

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    # Add computed is_low_stock to each product
    result = []
    for p in items:
        pd = ProductOut.from_orm(p)
        pd.is_low_stock = p.quantity <= p.low_stock_level
        result.append(pd)

    return {
        "items": result,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("", response_model=ProductOut, status_code=201)
async def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """Create a new product (Admin only)."""
    if db.query(Product).filter(Product.sku == data.sku).first():
        raise HTTPException(status_code=400, detail="SKU already exists")

    product = Product(**data.dict())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Get single product by ID."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.put("/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """Update product details (Admin only)."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    for field, value in data.dict(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}")
async def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """Soft-delete a product (Admin only)."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_active = False
    db.commit()
    return {"message": "Product deactivated successfully"}


@router.patch("/{product_id}/stock")
async def adjust_stock(
    product_id: int,
    quantity: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Adjust product stock quantity."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.quantity += quantity
    if product.quantity < 0:
        raise HTTPException(status_code=400, detail="Insufficient stock")
    db.commit()
    return {"product_id": product_id, "new_quantity": product.quantity}


# ─── Categories ───────────────────────────────────────────────────────────────

@router.get("/categories/all", response_model=list[CategoryOut])
async def list_categories(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    return db.query(Category).all()


@router.post("/categories", response_model=CategoryOut, status_code=201)
async def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    cat = Category(**data.dict())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


# ─── Suppliers ────────────────────────────────────────────────────────────────

@router.get("/suppliers/all", response_model=list[SupplierOut])
async def list_suppliers(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    return db.query(Supplier).all()


@router.post("/suppliers", response_model=SupplierOut, status_code=201)
async def create_supplier(
    data: SupplierCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    supplier = Supplier(**data.dict())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier
