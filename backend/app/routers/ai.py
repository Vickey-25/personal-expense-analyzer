from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from google import genai
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.db import get_db
from app.models import Expense, User
from app.security import get_current_user


router = APIRouter(
    prefix="/ai",
    tags=["AI"],
)

settings = get_settings()


# ---------------------------------------------------------
# REQUEST SCHEMA
# ---------------------------------------------------------

class AIInsightRequest(BaseModel):
    period: Literal["daily", "weekly", "monthly"] = "monthly"


# ---------------------------------------------------------
# RESPONSE SCHEMA
# ---------------------------------------------------------

class AIInsightResponse(BaseModel):
    period: str
    total_expense: Decimal
    transaction_count: int
    highest_spending_category: str | None
    insight: str


# ---------------------------------------------------------
# GET DATE RANGE
# ---------------------------------------------------------

def get_date_range(period: str) -> tuple[date, date]:
    end_date = date.today()

    if period == "daily":
        return end_date, end_date

    if period == "weekly":
        start_date = end_date - timedelta(days=6)
        return start_date, end_date

    # monthly
    start_date = end_date.replace(day=1)

    return start_date, end_date


# ---------------------------------------------------------
# AI INSIGHT ENDPOINT
# ---------------------------------------------------------

@router.post(
    "/insights",
    response_model=AIInsightResponse,
)
def generate_ai_insight(
    payload: AIInsightRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    # -----------------------------------------------------
    # 1. CHECK API KEY
    # -----------------------------------------------------

    if not settings.gemini_api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not configured",
        )

    # -----------------------------------------------------
    # 2. GET DATE RANGE
    # -----------------------------------------------------

    start_date, end_date = get_date_range(
        payload.period
    )

    # -----------------------------------------------------
    # 3. GET USER EXPENSES
    # -----------------------------------------------------

    expenses = db.scalars(
        select(Expense)
        .options(joinedload(Expense.category))
        .where(
            Expense.user_id == current_user.id,
            Expense.expense_date.between(
                start_date,
                end_date,
            ),
        )
        .order_by(
            Expense.expense_date
        )
    ).all()

    # -----------------------------------------------------
    # 4. NO EXPENSE DATA
    # -----------------------------------------------------

    if not expenses:
        return AIInsightResponse(
            period=payload.period,
            total_expense=Decimal("0.00"),
            transaction_count=0,
            highest_spending_category=None,
            insight=(
                f"No expenses were recorded for this "
                f"{payload.period} period. "
                "Add some expenses and generate an AI "
                "insight again."
            ),
        )

    # -----------------------------------------------------
    # 5. CALCULATE TOTAL
    # -----------------------------------------------------

    total_expense = sum(
        (
            expense.amount
            for expense in expenses
        ),
        Decimal("0.00"),
    )

    transaction_count = len(expenses)

    # -----------------------------------------------------
    # 6. CATEGORY BREAKDOWN
    # -----------------------------------------------------

    category_totals = defaultdict(Decimal)

    for expense in expenses:
        category_totals[
            expense.category.name
        ] += expense.amount

    sorted_categories = sorted(
        category_totals.items(),
        key=lambda item: item[1],
        reverse=True,
    )

    highest_spending_category = (
        sorted_categories[0][0]
        if sorted_categories
        else None
    )

    # -----------------------------------------------------
    # 7. PREPARE DATA FOR GEMINI
    # -----------------------------------------------------

    category_lines = "\n".join(
        f"- {category}: ₹{amount:.2f}"
        for category, amount in sorted_categories
    )

    prompt = f"""
You are an AI financial insights assistant for a
Personal Expense Analyzer application.

Analyze the user's spending summary.

Period:
{payload.period}

Date range:
{start_date} to {end_date}

Total expense:
₹{total_expense:.2f}

Transaction count:
{transaction_count}

Category breakdown:
{category_lines}

Highest spending category:
{highest_spending_category}

Generate one useful and concise financial insight.

Rules:
- Mention the total spending.
- Mention the highest spending category.
- Identify a spending pattern only when the data supports it.
- Give one practical suggestion.
- Do not invent numbers.
- If there is only one transaction, clearly say that the data
  is limited and avoid making strong conclusions.
- Do not give investment or tax advice.
- Keep the answer between 3 and 5 sentences.
"""

    # -----------------------------------------------------
    # 8. CALL GEMINI
    # -----------------------------------------------------

    try:
        client = genai.Client(
            api_key=settings.gemini_api_key
        )

        response = client.models.generate_content(
          model="gemini-3.5-flash-lite",
            contents=prompt,
        )

        insight = (
            response.text or ""
        ).strip()

        if not insight:
            raise HTTPException(
                status_code=502,
                detail="Gemini returned an empty response",
            )

    except HTTPException:
        raise

    except Exception as exc:
        print(
            "GEMINI ERROR:",
            repr(exc),
        )

        raise HTTPException(
            status_code=502,
            detail=(
                f"AI service error: {str(exc)}"
            ),
        )

    # -----------------------------------------------------
    # 9. RETURN AI RESPONSE
    # -----------------------------------------------------

    return AIInsightResponse(
        period=payload.period,
        total_expense=total_expense,
        transaction_count=transaction_count,
        highest_spending_category=(
            highest_spending_category
        ),
        insight=insight,
    )