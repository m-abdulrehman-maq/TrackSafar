from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models import Role


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    accept_terms: bool = Field(default=False)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class ProfileOut(BaseModel):
    id: str
    full_name: str
    email: str
    phone: str | None = None
    role: Role
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=160)
    phone: str | None = Field(default=None, max_length=32)


class AuthConfig(BaseModel):
    auth_mode: str
    registration_enabled: bool
    password_login_enabled: bool
