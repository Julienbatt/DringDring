from pydantic import BaseModel, EmailStr
from typing import Optional

from .common import Address


class ClientCreate(BaseModel):
    firstName: str
    lastName: str
    address: Address
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    floor: Optional[str] = None
    entryCode: Optional[str] = None
    cms: bool = False
    shopId: Optional[str] = None


class Client(ClientCreate):
    id: str


