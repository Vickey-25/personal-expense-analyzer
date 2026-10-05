from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=8, max_length=128)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    is_active: bool
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CategoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    description: str | None = Field(default=None, max_length=300)


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    created_at: datetime


class ExpenseCreate(BaseModel):
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    category_id: int
    description: str | None = Field(default=None, max_length=500)
    expense_date: date = Field(default_factory=date.today)


class ExpenseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    amount: Decimal
    category_id: int
    category_name: str
    description: str | None
    expense_date: date
    created_at: datetime


class ExpenseUpdate(BaseModel):
    amount: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    category_id: int | None = None
    description: str | None = Field(default=None, max_length=500)
    expense_date: date | None = None


class CategoryTotal(BaseModel):
    category: str
    total: Decimal


class PeriodTotal(BaseModel):
    period: date
    total: Decimal


class ExpenseReport(BaseModel):
    period: Literal["daily", "weekly", "monthly"]
    start_date: date
    end_date: date
    total_expense: Decimal
    transaction_count: int
    average_per_transaction: Decimal
    highest_spending_category: str | None
    category_breakdown: list[CategoryTotal]
    trend: list[PeriodTotal]
