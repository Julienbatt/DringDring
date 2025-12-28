from pydantic import BaseModel
from typing import Optional


class MeResponse(BaseModel):
    user_id: str
    email: Optional[str] = None
    role: Optional[str] = None
    city_id: Optional[str] = None
    hq_id: Optional[str] = None
    shop_id: Optional[str] = None
    admin_region_id: Optional[str] = None
