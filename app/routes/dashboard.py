"""
Dashboard Routes - Sales summaries, stock alerts, analytics data
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, timedelta

from app.db.database import get_db
from app.models.user import User, Bill, Product, BillStatus
from app.schemas.schemas import DashboardData
from app.core.security import get_current_user

router = APIRouter()


@router.get("", response_model=DashboardData)
async def get_dashboard(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Aggregate dashboard data: sales, stock, recent bills, low stock alerts."""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    year_start  = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

    completed = Bill.status == BillStatus.completed

    def sum_sales(start):
        r = db.query(func.coalesce(func.sum(Bill.grand_total), 0)).filter(
            completed, Bill.created_at >= start
        ).scalar()
        return float(r)

    def count_bills(start):
        return db.query(func.count(Bill.id)).filter(
            completed, Bill.created_at >= start
        ).scalar()

    # Sales
    sales = {
        "today": sum_sales(today_start),
        "this_month": sum_sales(month_start),
        "this_year": sum_sales(year_start),
        "today_count": count_bills(today_start),
        "month_count": count_bills(month_start),
    }

    # Stock
    total_products = db.query(func.count(Product.id)).filter(Product.is_active == True).scalar()
    low_stock = db.query(func.count(Product.id)).filter(
        Product.is_active == True,
        Product.quantity <= Product.low_stock_level,
        Product.quantity > 0
    ).scalar()
    out_of_stock = db.query(func.count(Product.id)).filter(
        Product.is_active == True, Product.quantity == 0
    ).scalar()
    total_value = db.query(
        func.coalesce(func.sum(Product.selling_price * Product.quantity), 0)
    ).filter(Product.is_active == True).scalar()

    stock = {
        "total_products": total_products,
        "low_stock_count": low_stock,
        "out_of_stock_count": out_of_stock,
        "total_value": float(total_value),
    }

    # Recent bills (last 10)
    recent_bills = db.query(Bill).filter(completed).order_by(
        Bill.created_at.desc()
    ).limit(10).all()

    # Low stock products
    low_stock_products = db.query(Product).filter(
        Product.is_active == True,
        Product.quantity <= Product.low_stock_level
    ).order_by(Product.quantity.asc()).limit(10).all()

    return {
        "sales": sales,
        "stock": stock,
        "recent_bills": recent_bills,
        "low_stock_products": low_stock_products,
    }


@router.get("/sales-chart")
async def get_sales_chart(
    period: str = "monthly",  # daily | monthly | yearly
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Sales chart data for the last 12 months or 30 days."""
    now = datetime.utcnow()

    if period == "daily":
        results = []
        for i in range(29, -1, -1):
            day = now - timedelta(days=i)
            start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            end   = start + timedelta(days=1)
            total = db.query(func.coalesce(func.sum(Bill.grand_total), 0)).filter(
                Bill.status == BillStatus.completed,
                Bill.created_at >= start,
                Bill.created_at < end
            ).scalar()
            results.append({"label": start.strftime("%d %b"), "total": float(total)})
        return results

    elif period == "monthly":
        results = []
        for i in range(11, -1, -1):
            month = (now.month - i - 1) % 12 + 1
            year  = now.year - ((now.month - i - 1) // 12)
            total = db.query(func.coalesce(func.sum(Bill.grand_total), 0)).filter(
                Bill.status == BillStatus.completed,
                extract("year",  Bill.created_at) == year,
                extract("month", Bill.created_at) == month,
            ).scalar()
            results.append({
                "label": datetime(year, month, 1).strftime("%b %Y"),
                "total": float(total)
            })
        return results

    else:  # yearly
        results = []
        for yr in range(now.year - 4, now.year + 1):
            total = db.query(func.coalesce(func.sum(Bill.grand_total), 0)).filter(
                Bill.status == BillStatus.completed,
                extract("year", Bill.created_at) == yr
            ).scalar()
            results.append({"label": str(yr), "total": float(total)})
        return results
