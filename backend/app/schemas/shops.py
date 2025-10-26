from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field
from pydantic import field_validator

from .common import Address


class Contact(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None


class ShopCreate(BaseModel):
    name: str
    address: Address
    email: EmailStr
    phone: str
    contacts: List[Contact] = []
    departments: List[str] = Field(default_factory=list, min_items=0, max_items=10)
    spreadsheetId: Optional[str] = None
    sheetName: Optional[str] = None
    regionId: Optional[str] = None
    chainId: Optional[str] = None
    chainName: Optional[str] = None
    shopType: Optional[str] = None  # 'store' | 'hq'
    parentShopId: Optional[str] = None
    # Optional pricing configuration for delivery fees
    pricing: Optional["ShopPricing"] = None

    @field_validator("regionId")
    @classmethod
    def validate_region(cls, v: Optional[str]):
        if v is None or v == "":
            return v
        allowed = {
            "AG","AI","AR","BE","BL","BS","FR","GE","GL","GR","JU","LU","NE","NW","OW","SG","SH","SO","SZ","TG","TI","UR","VD","VS","ZG","ZH"
        }
        if v not in allowed:
            raise ValueError("regionId must be a valid Swiss canton code (e.g., VS, VD, GE)")
        return v

    @field_validator("shopType")
    @classmethod
    def validate_shop_type(cls, v: Optional[str]):
        if v is None or v == "":
            return v
        if v not in {"store", "hq"}:
            raise ValueError("shopType must be 'store' or 'hq'")
        return v


class Shop(ShopCreate):
    id: str
    updatedAt: Optional[str] = None


# ---- Pricing configuration models ----

class PricingSplit(BaseModel):
    """Percentage-based split of the delivery fee. Values should sum to 100, but we will normalize if not."""
    shopPercent: float = 33.34
    authorityPercent: float = 33.33
    chainPercent: float = 33.33


class PricingBagsConfig(BaseModel):
    """Block pricing by bags, e.g., 15 CHF per 2 bags; CMS variant cheaper."""
    bagsPerStep: int = 2
    pricePerStep: float = 15.0
    cmsPricePerStep: Optional[float] = None  # if None, falls back to pricePerStep


class PricingAmountConfig(BaseModel):
    """Threshold pricing by shopping cart amount."""
    threshold: float
    priceBelowOrEqual: float
    priceAbove: float
    cmsPriceBelowOrEqual: Optional[float] = None
    cmsPriceAbove: Optional[float] = None


class ShopPricing(BaseModel):
    """Shop pricing options; if both are provided, `mode` decides which to use.
    Default mode is 'bags'.
    """
    mode: str = "bags"  # 'bags' | 'amount'
    bags: Optional[PricingBagsConfig] = PricingBagsConfig()
    amount: Optional[PricingAmountConfig] = None
    split: PricingSplit = PricingSplit()


# Forward references resolution
ShopCreate.model_rebuild()


