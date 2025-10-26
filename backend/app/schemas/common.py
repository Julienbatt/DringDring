from pydantic import BaseModel, Field, constr


SwissZip = constr(pattern=r"^\d{4}$")


class Address(BaseModel):
    street: str = Field(..., description="Street name")
    streetNumber: str = Field(..., description="Street number")
    zip: SwissZip = Field(..., description="Swiss NPA (4 digits)")
    city: str = Field(..., description="City")


