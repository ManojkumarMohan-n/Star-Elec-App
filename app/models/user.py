"""
Database Models - SQLAlchemy ORM models for all entities
"""

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text,
    ForeignKey, Enum, JSON, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.db.database import Base


# ─── Enums ────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    admin = "admin"
    staff = "staff"

class BillStatus(str, enum.Enum):
    draft = "draft"
    completed = "completed"
    cancelled = "cancelled"


# ─── User Model ───────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(100), nullable=False)
    email      = Column(String(150), unique=True, index=True, nullable=False)
    phone      = Column(String(20))
    password   = Column(String(255), nullable=False)
    role       = Column(Enum(UserRole), default=UserRole.staff)
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    bills = relationship("Bill", back_populates="created_by_user")


# ─── Category Model ───────────────────────────────────────────────────────────

class Category(Base):
    __tablename__ = "categories"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    products = relationship("Product", back_populates="category")


# ─── Supplier Model ───────────────────────────────────────────────────────────

class Supplier(Base):
    __tablename__ = "suppliers"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(150), nullable=False)
    email      = Column(String(150))
    phone      = Column(String(20))
    address    = Column(Text)
    gstin      = Column(String(20))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    products = relationship("Product", back_populates="supplier")


# ─── Product Model ────────────────────────────────────────────────────────────

class Product(Base):
    __tablename__ = "products"

    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String(200), nullable=False)
    sku             = Column(String(50), unique=True, index=True, nullable=False)
    barcode         = Column(String(100), unique=True, index=True)
    category_id     = Column(Integer, ForeignKey("categories.id"))
    supplier_id     = Column(Integer, ForeignKey("suppliers.id"))
    purchase_price  = Column(Float, nullable=False, default=0.0)
    selling_price   = Column(Float, nullable=False, default=0.0)
    quantity        = Column(Integer, default=0)
    low_stock_level = Column(Integer, default=10)
    unit            = Column(String(20), default="piece")
    description     = Column(Text)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    category   = relationship("Category", back_populates="products")
    supplier   = relationship("Supplier", back_populates="products")
    bill_items = relationship("BillItem", back_populates="product")

    __table_args__ = (
        Index("idx_product_name", "name"),
        Index("idx_product_active", "is_active"),
    )


# ─── Customer Model ───────────────────────────────────────────────────────────

class Customer(Base):
    __tablename__ = "customers"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(150), nullable=False)
    email      = Column(String(150), index=True)
    phone      = Column(String(20), index=True)
    address    = Column(Text)
    gstin      = Column(String(20))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    bills = relationship("Bill", back_populates="customer")


# ─── Bill Model ───────────────────────────────────────────────────────────────

class Bill(Base):
    __tablename__ = "bills"

    id             = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(50), unique=True, index=True, nullable=False)
    customer_id    = Column(Integer, ForeignKey("customers.id"), nullable=True)
    customer_name  = Column(String(150))   # Walk-in customer fallback
    created_by     = Column(Integer, ForeignKey("users.id"), nullable=False)
    status         = Column(Enum(BillStatus), default=BillStatus.completed)

    # Financial summary
    subtotal        = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    discount_pct    = Column(Float, default=0.0)
    cgst_amount     = Column(Float, default=0.0)
    sgst_amount     = Column(Float, default=0.0)
    igst_amount     = Column(Float, default=0.0)
    total_tax       = Column(Float, default=0.0)
    grand_total     = Column(Float, default=0.0)
    amount_paid     = Column(Float, default=0.0)
    payment_method  = Column(String(50), default="cash")
    notes           = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    customer       = relationship("Customer", back_populates="bills")
    created_by_user = relationship("User", back_populates="bills")
    items          = relationship("BillItem", back_populates="bill", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_bill_date", "created_at"),
        Index("idx_bill_status", "status"),
    )


# ─── BillItem Model ───────────────────────────────────────────────────────────

class BillItem(Base):
    __tablename__ = "bill_items"

    id          = Column(Integer, primary_key=True, index=True)
    bill_id     = Column(Integer, ForeignKey("bills.id"), nullable=False)
    product_id  = Column(Integer, ForeignKey("products.id"), nullable=False)
    product_name = Column(String(200))   # Snapshot at time of sale
    sku         = Column(String(50))
    quantity    = Column(Integer, nullable=False)
    unit_price  = Column(Float, nullable=False)
    discount_pct = Column(Float, default=0.0)
    gst_rate    = Column(Float, default=18.0)
    tax_amount  = Column(Float, default=0.0)
    total_price = Column(Float, nullable=False)

    bill    = relationship("Bill", back_populates="items")
    product = relationship("Product", back_populates="bill_items")
