"""
Billing Routes - Create bills, generate invoices, manage billing history
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from datetime import datetime
import random
import string
import os

from app.db.database import get_db
from app.models.user import User, Bill, BillItem, BillStatus, Product, Customer
from app.schemas.schemas import BillCreate, BillOut, PaginatedResponse
from app.core.security import get_current_user
from app.services.pdf_service import generate_invoice_pdf

router = APIRouter()


def generate_invoice_number() -> str:
    """Generate unique invoice number: INV-YYYYMM-XXXXX"""
    now = datetime.now()
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f"INV-{now.year}{now.month:02d}-{suffix}"


def calculate_bill_totals(items_data: list, discount_pct: float) -> dict:
    """Calculate all financial totals for a bill."""
    subtotal = 0.0
    cgst = sgst = igst = total_tax = 0.0

    computed_items = []
    for item in items_data:
        line_total = item["quantity"] * item["unit_price"]
        discount_amt = line_total * item["discount_pct"] / 100
        taxable = line_total - discount_amt
        tax = taxable * item["gst_rate"] / 100
        total = taxable + tax

        subtotal += taxable
        half_gst = tax / 2
        cgst += half_gst
        sgst += half_gst
        total_tax += tax

        computed_items.append({**item, "tax_amount": tax, "total_price": total})

    discount_amount = subtotal * discount_pct / 100
    subtotal_after_disc = subtotal - discount_amount
    grand_total = subtotal_after_disc + total_tax

    return {
        "subtotal": round(subtotal, 2),
        "discount_amount": round(discount_amount, 2),
        "cgst_amount": round(cgst, 2),
        "sgst_amount": round(sgst, 2),
        "igst_amount": round(igst, 2),
        "total_tax": round(total_tax, 2),
        "grand_total": round(grand_total, 2),
        "computed_items": computed_items,
    }


@router.post("", response_model=BillOut, status_code=201)
async def create_bill(
    data: BillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new bill:
    1. Validate all products and stock availability
    2. Calculate totals, GST, discounts
    3. Create Bill + BillItems records
    4. Deduct stock from inventory automatically
    """
    items_data = []
    for item in data.items:
        product = db.query(Product).filter(
            Product.id == item.product_id, Product.is_active == True
        ).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product ID {item.product_id} not found")
        if product.quantity < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for '{product.name}'. Available: {product.quantity}"
            )
        items_data.append({
            "product_id": item.product_id,
            "product_name": product.name,
            "sku": product.sku,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "discount_pct": item.discount_pct,
            "gst_rate": item.gst_rate,
        })

    # Calculate totals
    totals = calculate_bill_totals(items_data, data.discount_pct)

    # Create bill
    bill = Bill(
        invoice_number=generate_invoice_number(),
        customer_id=data.customer_id,
        customer_name=data.customer_name,
        created_by=current_user.id,
        discount_pct=data.discount_pct,
        payment_method=data.payment_method,
        amount_paid=data.amount_paid or totals["grand_total"],
        notes=data.notes,
        **{k: v for k, v in totals.items() if k != "computed_items"}
    )
    db.add(bill)
    db.flush()

    # Create bill items and deduct stock
    for item_data in totals["computed_items"]:
        bill_item = BillItem(bill_id=bill.id, **{k: v for k, v in item_data.items()})
        db.add(bill_item)

        # Deduct stock
        product = db.query(Product).filter(Product.id == item_data["product_id"]).first()
        product.quantity -= item_data["quantity"]

    db.commit()
    db.refresh(bill)
    return bill


@router.get("", response_model=PaginatedResponse)
async def list_bills(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """List bills with filters and pagination."""
    query = db.query(Bill)

    if search:
        query = query.filter(
            or_(
                Bill.invoice_number.ilike(f"%{search}%"),
                Bill.customer_name.ilike(f"%{search}%"),
            )
        )
    if date_from:
        query = query.filter(Bill.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(Bill.created_at <= datetime.fromisoformat(date_to))
    if status:
        query = query.filter(Bill.status == status)

    query = query.order_by(Bill.created_at.desc())
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/{bill_id}", response_model=BillOut)
async def get_bill(
    bill_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Get single bill by ID."""
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    return bill


@router.get("/{bill_id}/pdf")
async def download_invoice_pdf(
    bill_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Generate and download invoice as PDF."""
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    pdf_path = generate_invoice_pdf(bill)
    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=f"{bill.invoice_number}.pdf"
    )


@router.patch("/{bill_id}/cancel")
async def cancel_bill(
    bill_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Cancel a bill and restore stock quantities."""
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    if bill.status == BillStatus.cancelled:
        raise HTTPException(status_code=400, detail="Bill already cancelled")

    # Restore stock
    for item in bill.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            product.quantity += item.quantity

    bill.status = BillStatus.cancelled
    db.commit()
    return {"message": "Bill cancelled and stock restored"}
