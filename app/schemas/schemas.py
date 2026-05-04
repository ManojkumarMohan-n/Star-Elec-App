"""
Pydantic Schemas - Request/Response validation and serialization
"""

from pydantic import BaseModel, EmailStr, validator, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ─── Enums ────────────────────────────────────────────────────────────────────

class UserRole(str, Enum):
    admin = "admin"
    staff = "staff"

class BillStatus(str, Enum):
    draft = "draft"
    completed = "completed"
    cancelled = "cancelled"


# ─── Auth Schemas ─────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"

class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: Optional[str]
    password: str = Field(..., min_length=6)
    role: UserRole = UserRole.staff

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str]
    role: UserRole
    is_active: bool
    created_at: datetime
    class Config: from_attributes = True

class UserUpdate(BaseModel):
    name: Optional[str]
    phone: Optional[str]
    role: Optional[UserRole]
    is_active: Optional[bool]


# ─── Category Schemas ─────────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=2)
    description: Optional[str]

class CategoryOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    class Config: from_attributes = True


# ─── Supplier Schemas ─────────────────────────────────────────────────────────

class SupplierCreate(BaseModel):
    name: str
    email: Optional[EmailStr]
    phone: Optional[str]
    address: Optional[str]
    gstin: Optional[str]

class SupplierOut(BaseModel):
    id: int
    name: str
    email: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    gstin: Optional[str]
    class Config: from_attributes = True


# ─── Product Schemas ──────────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    name: str = Field(..., min_length=2)
    sku: str = Field(..., min_length=2)
    barcode: Optional[str]
    category_id: Optional[int]
    supplier_id: Optional[int]
    purchase_price: float = Field(..., ge=0)
    selling_price: float = Field(..., ge=0)
    quantity: int = Field(0, ge=0)
    low_stock_level: int = Field(10, ge=0)
    unit: str = "piece"
    description: Optional[str]

class ProductUpdate(BaseModel):
    name: Optional[str]
    barcode: Optional[str]
    category_id: Optional[int]
    supplier_id: Optional[int]
    purchase_price: Optional[float]
    selling_price: Optional[float]
    quantity: Optional[int]
    low_stock_level: Optional[int]
    unit: Optional[str]
    description: Optional[str]
    is_active: Optional[bool]

class ProductOut(BaseModel):
    id: int
    name: str
    sku: str
    barcode: Optional[str]
    category: Optional[CategoryOut]
    supplier: Optional[SupplierOut]
    purchase_price: float
    selling_price: float
    quantity: int
    low_stock_level: int
    unit: str
    description: Optional[str]
    is_active: bool
    is_low_stock: bool = False
    created_at: datetime

    @validator("is_low_stock", always=True, pre=False)
    def compute_low_stock(cls, v, values):
        return values.get("quantity", 0) <= values.get("low_stock_level", 10)

    class Config: from_attributes = True


# ─── Customer Schemas ─────────────────────────────────────────────────────────

class CustomerCreate(BaseModel):
    name: str
    email: Optional[EmailStr]
    phone: Optional[str]
    address: Optional[str]
    gstin: Optional[str]

class CustomerOut(BaseModel):
    id: int
    name: str
    email: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    gstin: Optional[str]
    created_at: datetime
    class Config: from_attributes = True


# ─── Billing Schemas ──────────────────────────────────────────────────────────

class BillItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)
    unit_price: float = Field(..., ge=0)
    discount_pct: float = Field(0.0, ge=0, le=100)
    gst_rate: float = Field(18.0, ge=0)

class BillItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    sku: str
    quantity: int
    unit_price: float
    discount_pct: float
    gst_rate: float
    tax_amount: float
    total_price: float
    class Config: from_attributes = True

class BillCreate(BaseModel):
    customer_id: Optional[int]
    customer_name: Optional[str]
    items: List[BillItemCreate] = Field(..., min_items=1)
    discount_pct: float = Field(0.0, ge=0, le=100)
    payment_method: str = "cash"
    amount_paid: Optional[float]
    notes: Optional[str]

class BillOut(BaseModel):
    id: int
    invoice_number: str
    customer: Optional[CustomerOut]
    customer_name: Optional[str]
    status: BillStatus
    items: List[BillItemOut]
    subtotal: float
    discount_amount: float
    discount_pct: float
    cgst_amount: float
    sgst_amount: float
    igst_amount: float
    total_tax: float
    grand_total: float
    amount_paid: float
    payment_method: str
    notes: Optional[str]
    created_at: datetime
    class Config: from_attributes = True


# ─── Dashboard Schemas ────────────────────────────────────────────────────────

class SalesSummary(BaseModel):
    today: float
    this_month: float
    this_year: float
    today_count: int
    month_count: int

class StockSummary(BaseModel):
    total_products: int
    low_stock_count: int
    out_of_stock_count: int
    total_value: float

class DashboardData(BaseModel):
    sales: SalesSummary
    stock: StockSummary
    recent_bills: List[BillOut]
    low_stock_products: List[ProductOut]


# ─── Pagination ───────────────────────────────────────────────────────────────

class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    total_pages: int
