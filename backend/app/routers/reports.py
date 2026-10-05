from datetime import date, timedelta
from decimal import Decimal
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import Date, func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Category, Expense, User
from app.schemas import CategoryTotal, ExpenseReport, PeriodTotal
from app.security import get_current_user

router = APIRouter(prefix="/reports", tags=["Reports"])


def default_range(period: str) -> tuple[date, date]:
    end = date.today()

    if period == "daily":
        return end, end

    if period == "weekly":
        start = end - timedelta(days=6)
        return start, end

    # monthly
    start = end.replace(day=1)
    next_month = (start.replace(day=28) + timedelta(days=4)).replace(day=1)

    return start, next_month - timedelta(days=1)


@router.get("/summary", response_model=ExpenseReport)
def expense_summary(
    period: Literal["daily", "weekly", "monthly"] = "monthly",
    start_date: Annotated[date | None, Query()] = None,
    end_date: Annotated[date | None, Query()] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Get default date range
    default_start, default_end = default_range(period)

    start = start_date or default_start
    end = end_date or default_end

    if start > end:
        raise HTTPException(
            status_code=400,
            detail="start_date must be on or before end_date",
        )

    # ---------------------------------------------------------
    # 1. TOTAL EXPENSE + TRANSACTION COUNT
    # ---------------------------------------------------------
    total, count = db.execute(
        select(
            func.coalesce(func.sum(Expense.amount), 0),
            func.count(Expense.id),
        ).where(
            Expense.user_id == current_user.id,
            Expense.expense_date.between(start, end),
        )
    ).one()

    # ---------------------------------------------------------
    # 2. CATEGORY-WISE EXPENSE
    # ---------------------------------------------------------
    category_rows = db.execute(
        select(
            Category.name,
            func.coalesce(func.sum(Expense.amount), 0),
        )
        .join(
            Expense,
            Expense.category_id == Category.id,
        )
        .where(
            Expense.user_id == current_user.id,
            Expense.expense_date.between(start, end),
        )
        .group_by(
            Category.id,
            Category.name,
        )
        .order_by(
            func.sum(Expense.amount).desc()
        )
    ).all()

    # ---------------------------------------------------------
    # 3. SPENDING TREND
    # ---------------------------------------------------------
    if period == "daily":
        # Daily report → group by each date
        period_expr = Expense.expense_date

    elif period == "weekly":
        # Weekly report → group by week
        period_expr = func.date_trunc(
            "week",
            Expense.expense_date,
        ).cast(Date)

    else:
        # Monthly report → group by month
        period_expr = func.date_trunc(
            "month",
            Expense.expense_date,
        ).cast(Date)

    trend_rows = db.execute(
        select(
            period_expr.label("period"),
            func.coalesce(
                func.sum(Expense.amount),
                0,
            ).label("total"),
        )
        .where(
            Expense.user_id == current_user.id,
            Expense.expense_date.between(start, end),
        )
        .group_by(period_expr)
        .order_by(period_expr)
    ).all()

    # ---------------------------------------------------------
    # 4. DECIMAL CONVERSION
    # ---------------------------------------------------------
    total_decimal = Decimal(str(total or 0))

    count_int = int(count or 0)

    if count_int > 0:
        average = total_decimal / count_int
    else:
        average = Decimal("0.00")

    # ---------------------------------------------------------
    # 5. RESPONSE
    # ---------------------------------------------------------
    return ExpenseReport(
        period=period,
        start_date=start,
        end_date=end,
        total_expense=total_decimal,
        transaction_count=count_int,
        average_per_transaction=average.quantize(
            Decimal("0.01")
        ),
        highest_spending_category=(
            category_rows[0][0]
            if category_rows
            else None
        ),
        category_breakdown=[
            CategoryTotal(
                category=row[0],
                total=Decimal(str(row[1] or 0)),
            )
            for row in category_rows
        ],
        trend=[
            PeriodTotal(
                period=row[0],
                total=Decimal(str(row[1] or 0)),
            )
            for row in trend_rows
        ],
    )


@router.get("/dashboard")
def dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()

    # Last 7 days including today
    week_start = today - timedelta(days=6)

    # Current month
    month_start = today.replace(day=1)

    def total_between(start: date, end: date) -> Decimal:
        value = db.scalar(
            select(
                func.coalesce(
                    func.sum(Expense.amount),
                    0,
                )
            ).where(
                Expense.user_id == current_user.id,
                Expense.expense_date.between(start, end),
            )
        )

        return Decimal(str(value or 0))

    return {
        "today": {
            "start_date": today,
            "end_date": today,
            "total": total_between(
                today,
                today,
            ),
        },
        "last_7_days": {
            "start_date": week_start,
            "end_date": today,
            "total": total_between(
                week_start,
                today,
            ),
        },
        "this_month": {
            "start_date": month_start,
            "end_date": today,
            "total": total_between(
                month_start,
                today,
            ),
        },
    }