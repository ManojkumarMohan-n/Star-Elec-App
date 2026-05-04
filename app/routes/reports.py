"""
Reports Routes - Export sales data as PDF/CSV
"""

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime
import csv, io

from app.db.database import get_db
from app.models.user import User, Bill, BillItem, BillStatus
from app.core.security import get_current_user

router = APIRouter()


@router.get("/export/csv")
async def export_csv(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Export sales report as CSV."""
    query = db.query(Bill).filter(Bill.status == BillStatus.completed)
    if date_from:
        query = query.filter(Bill.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(Bill.created_at <= datetime.fromisoformat(date_to))

    bills = query.order_by(Bill.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Invoice No", "Date", "Customer", "Subtotal",
        "Discount", "Tax", "Grand Total", "Payment Method"
    ])
    for b in bills:
        writer.writerow([
            b.invoice_number,
            b.created_at.strftime("%Y-%m-%d %H:%M"),
            b.customer_name or (b.customer.name if b.customer else "Walk-in"),
            b.subtotal, b.discount_amount, b.total_tax,
            b.grand_total, b.payment_method
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sales_report.csv"}
    )


@router.get("/summary")
async def sales_summary(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Get aggregate sales summary for a date range."""
    query = db.query(Bill).filter(Bill.status == BillStatus.completed)
    if date_from:
        query = query.filter(Bill.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(Bill.created_at <= datetime.fromisoformat(date_to))

    result = db.query(
        func.count(Bill.id).label("total_bills"),
        func.coalesce(func.sum(Bill.grand_total), 0).label("total_revenue"),
        func.coalesce(func.sum(Bill.total_tax), 0).label("total_tax"),
        func.coalesce(func.sum(Bill.discount_amount), 0).label("total_discount"),
    ).filter(Bill.status == BillStatus.completed)

    if date_from:
        result = result.filter(Bill.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        result = result.filter(Bill.created_at <= datetime.fromisoformat(date_to))

    row = result.first()
    return {
        "total_bills": row.total_bills,
        "total_revenue": float(row.total_revenue),
        "total_tax": float(row.total_tax),
        "total_discount": float(row.total_discount),
    }
