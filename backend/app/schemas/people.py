from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models import Role


class PassengerCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=32)
    password: str = Field(min_length=8, max_length=128)


class PassengerOut(BaseModel):
    id: str
    full_name: str
    email: str
    phone: str | None = None
    role: Role
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class PassengerUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=160)
    phone: str | None = Field(default=None, max_length=32)
    is_active: bool | None = None


class DriverProvisionRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    driver_code: str = Field(min_length=2, max_length=32)
    license_number: str | None = Field(default=None, max_length=64)
    phone: str | None = Field(default=None, max_length=32)
    temporary_password: str | None = Field(
        default=None, min_length=8, max_length=128,
        description="Development-mode initial password. Supabase mode uses provider invites.",
    )


class DriverUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=160)
    phone: str | None = Field(default=None, max_length=32)
    license_number: str | None = Field(default=None, max_length=64)
    is_active: bool | None = None
    driver_profile_active: bool | None = None


class DriverOut(BaseModel):
    id: str
    profile_id: str
    driver_code: str
    license_number: str | None = None
    is_active: bool
    full_name: str
    email: str
    phone: str | None = None
    profile_active: bool
    role: Role
    created_at: datetime

    model_config = {"from_attributes": True}
