"""
Electrical Shop Billing & Inventory Management System
FastAPI Backend - Main Application Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import uvicorn

from app.core.config import settings
from app.db.database import engine, Base
from app.api.routes import (
    auth, dashboard, products, billing, reports, customers, settings as settings_router
)

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Electrical Shop Management System",
    description="Full-stack billing and inventory management for electrical shops",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router,       prefix="/api/auth",      tags=["Authentication"])
app.include_router(dashboard.router,  prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(products.router,   prefix="/api/products",  tags=["Products"])
app.include_router(billing.router,    prefix="/api/billing",   tags=["Billing"])
app.include_router(reports.router,    prefix="/api/reports",   tags=["Reports"])
app.include_router(customers.router,  prefix="/api/customers", tags=["Customers"])
app.include_router(settings_router.router, prefix="/api/settings", tags=["Settings"])

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
