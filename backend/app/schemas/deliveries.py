from pydantic import BaseModel, Field, conint, confloat
from typing import Optional


class DeliveryCreate(BaseModel):
    shopId: Optional[str] = None
    clientId: str
    employee: str
    sector: Optional[str] = None
    ticketNo: Optional[str] = None
    amount: Optional[confloat(ge=0)] = None
    today: bool = False
    startWindow: str
    bags: conint(ge=0, le=20)
    courierNotes: Optional[str] = None


class Delivery(DeliveryCreate):
    id: str
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    courierNotes: Optional[str] = None
    clientName: Optional[str] = None
    clientAddress: Optional[str] = None


