"""Settings Routes"""
from fastapi import APIRouter, Depends
from app.models.user import User
from app.core.security import get_current_admin

router = APIRouter()

@router.get("")
async def get_settings(_: User = Depends(get_current_admin)):
    return {"gst_rate": 18.0, "currency": "INR", "shop_name": "Electrical Shop"}
