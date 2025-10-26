"""
Simplified validation schemas for better UX
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import re

class DeliveryValidation(BaseModel):
    """Enhanced delivery validation with better error messages"""
    shopId: str = Field(..., min_length=1, description="Shop ID is required")
    clientId: str = Field(..., min_length=1, description="Client ID is required")
    bags: int = Field(..., ge=0, le=50, description="Bags must be between 0 and 50")
    amount: Optional[float] = Field(None, ge=0, le=10000, description="Amount must be between 0 and 10,000 CHF")
    employee: Optional[str] = Field(None, max_length=100, description="Employee name too long")
    sector: Optional[str] = Field(None, max_length=50, description="Sector name too long")
    ticketNo: Optional[str] = Field(None, max_length=20, description="Ticket number too long")
    startWindow: Optional[str] = Field(None, description="Start window must be valid ISO datetime")
    endWindow: Optional[str] = Field(None, description="End window must be valid ISO datetime")
    
    @field_validator('startWindow', 'endWindow')
    @classmethod
    def validate_datetime(cls, v):
        if v is None:
            return v
        try:
            datetime.fromisoformat(v.replace('Z', '+00:00'))
            return v
        except ValueError:
            raise ValueError('Invalid datetime format. Use ISO format (YYYY-MM-DDTHH:MM:SSZ)')
    
    @field_validator('employee')
    @classmethod
    def validate_employee_name(cls, v):
        if v is None:
            return v
        if not re.match(r'^[a-zA-ZÀ-ÿ\s\-\'\.]+$', v):
            raise ValueError('Employee name contains invalid characters')
        return v.strip()
    
    @field_validator('sector')
    @classmethod
    def validate_sector_name(cls, v):
        if v is None:
            return v
        if not re.match(r'^[a-zA-ZÀ-ÿ\s\-\'\.]+$', v):
            raise ValueError('Sector name contains invalid characters')
        return v.strip()
    
    @field_validator('ticketNo')
    @classmethod
    def validate_ticket_number(cls, v):
        if v is None:
            return v
        if not re.match(r'^[A-Z0-9\-_]+$', v):
            raise ValueError('Ticket number can only contain uppercase letters, numbers, hyphens, and underscores')
        return v.strip()

class ShopValidation(BaseModel):
    """Enhanced shop validation"""
    name: str = Field(..., min_length=2, max_length=100, description="Shop name must be between 2 and 100 characters")
    address: Dict[str, Any] = Field(..., description="Address is required")
    email: Optional[str] = Field(None, description="Invalid email format")
    phone: Optional[str] = Field(None, description="Invalid phone number format")
    regionId: str = Field(..., min_length=1, description="Region ID is required")
    chainId: Optional[str] = Field(None, min_length=1, description="Chain ID must not be empty if provided")
    chainName: Optional[str] = Field(None, max_length=100, description="Chain name too long")
    
    @field_validator('name')
    @classmethod
    def validate_shop_name(cls, v):
        if not re.match(r'^[a-zA-ZÀ-ÿ0-9\s\-\'\.&]+$', v):
            raise ValueError('Shop name contains invalid characters')
        return v.strip()
    
    @field_validator('address')
    @classmethod
    def validate_address(cls, v):
        if not isinstance(v, dict):
            raise ValueError('Address must be an object')
        
        required_fields = ['street', 'city', 'zip']
        for field in required_fields:
            if field not in v or not v[field]:
                raise ValueError(f'Address {field} is required')
        
        # Validate zip code format (Swiss format)
        zip_code = v.get('zip', '')
        if not re.match(r'^\d{4}$', zip_code):
            raise ValueError('Swiss zip code must be 4 digits')
        
        return v

class ClientValidation(BaseModel):
    """Enhanced client validation"""
    firstName: str = Field(..., min_length=1, max_length=50, description="First name must be between 1 and 50 characters")
    lastName: str = Field(..., min_length=1, max_length=50, description="Last name must be between 1 and 50 characters")
    phone: str = Field(..., description="Invalid phone number format")
    email: Optional[str] = Field(None, description="Invalid email format")
    address: Dict[str, Any] = Field(..., description="Address is required")
    shopId: str = Field(..., min_length=1, description="Shop ID is required")
    cms: bool = Field(default=False, description="CMS status")
    
    @field_validator('firstName', 'lastName')
    @classmethod
    def validate_names(cls, v):
        if not re.match(r'^[a-zA-ZÀ-ÿ\s\-\'\.]+$', v):
            raise ValueError('Name contains invalid characters')
        return v.strip()
    
    @field_validator('address')
    @classmethod
    def validate_client_address(cls, v):
        if not isinstance(v, dict):
            raise ValueError('Address must be an object')
        
        required_fields = ['street', 'city', 'zip']
        for field in required_fields:
            if field not in v or not v[field]:
                raise ValueError(f'Address {field} is required')
        
        return v

class ExportValidation(BaseModel):
    """Export request validation"""
    days: int = Field(30, ge=1, le=365, description="Days must be between 1 and 365")
    start_date: Optional[str] = Field(None, description="Start date for export")
    end_date: Optional[str] = Field(None, description="End date for export")
    
    @field_validator('start_date', 'end_date')
    @classmethod
    def validate_date_format(cls, v):
        if v is None:
            return v
        try:
            datetime.fromisoformat(v.replace('Z', '+00:00'))
            return v
        except ValueError:
            raise ValueError('Invalid date format. Use ISO format (YYYY-MM-DD)')
