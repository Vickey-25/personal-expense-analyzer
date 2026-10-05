from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.models import Category, Expense, User
from app.schemas import ExpenseCreate, ExpenseRead, ExpenseUpdate
from app.security import get_current_user

router = APIRouter(prefix="/expenses", tags=["Expenses"])


def to_schema(expense: Expense) -> ExpenseRead:
    return ExpenseRead(
        id=expense.id,
        amount=expense.amount,
        category_id=expense.category_id,
        category_name=expense.category.name,
        description=expense.description,
        expense_date=expense.expense_date,
        created_at=expense.created_at,
    )


@router.post("", response_model=ExpenseRead, status_code=status.HTTP_201_CREATED)
def create_expense(
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category = db.get(Category, payload.category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    expense = Expense(user_id=current_user.id, **payload.model_dump())
    db.add(expense)
    db.commit()
    db.refresh(expense)
    expense.category = category
    return to_schema(expense)


@router.get("", response_model=list[ExpenseRead])
def list_expenses(
    start_date: Annotated[date | None, Query()] = None,
    end_date: Annotated[date | None, Query()] = None,
    category_id: Annotated[int | None, Query()] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(Expense)
        .options(joinedload(Expense.category))
        .where(Expense.user_id == current_user.id)
        .order_by(Expense.expense_date.desc(), Expense.id.desc())
    )

    if start_date:
        stmt = stmt.where(Expense.expense_date >= start_date)
    if end_date:
        stmt = stmt.where(Expense.expense_date <= end_date)
    if category_id:
        stmt = stmt.where(Expense.category_id == category_id)

    expenses = db.scalars(stmt).all()
    return [to_schema(expense) for expense in expenses]


@router.get("/{expense_id}", response_model=ExpenseRead)
def get_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = db.scalar(
        select(Expense)
        .options(joinedload(Expense.category))
        .where(Expense.id == expense_id, Expense.user_id == current_user.id)
    )
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return to_schema(expense)


@router.put("/{expense_id}", response_model=ExpenseRead)
def update_expense(
    expense_id: int,
    payload: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = db.scalar(
        select(Expense)
        .options(joinedload(Expense.category))
        .where(Expense.id == expense_id, Expense.user_id == current_user.id)
    )
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    data = payload.model_dump(exclude_unset=True)
    if "category_id" in data:
        category = db.get(Category, data["category_id"])
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")

    for key, value in data.items():
        setattr(expense, key, value)

    db.commit()
    db.refresh(expense)
    expense.category = db.get(Category, expense.category_id)
    return to_schema(expense)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = db.scalar(
        select(Expense).where(Expense.id == expense_id, Expense.user_id == current_user.id)
    )
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    db.delete(expense)
    db.commit()
