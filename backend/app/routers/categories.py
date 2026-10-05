from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Category, User
from app.schemas import CategoryCreate, CategoryRead
from app.security import get_current_user

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=list[CategoryRead])
def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return list(db.scalars(select(Category).order_by(func.lower(Category.name))).all())


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    name = payload.name.strip()
    existing = db.scalar(select(Category).where(func.lower(Category.name) == name.lower()))
    if existing:
        raise HTTPException(status_code=409, detail="Category already exists")

    category = Category(name=name, description=payload.description)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category
