# Personal Expense Analyzer — FastAPI Backend

A production-style starter backend for a personal expense analyzer.

## Stack

- FastAPI
- PostgreSQL
- SQLAlchemy 2.x
- JWT authentication
- Pydantic Settings
- React-friendly CORS

## Features

- Register/login with JWT authentication
- Default expense categories
- Create, read, update and delete expenses
- Filter expenses by date and category
- Daily, weekly and monthly expense summaries
- Category-wise spending analysis
- Dashboard totals for today, last 7 days and current month
- Swagger/OpenAPI documentation

## Project structure

```text
personal-expense-analyzer-backend/
├── app/
│   ├── core/config.py
│   ├── routers/
│   │   ├── auth.py
│   │   ├── categories.py
│   │   ├── expenses.py
│   │   └── reports.py
│   ├── db.py
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   ├── security.py
│   └── seed.py
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── README.md
```

## Option A — Run with local PostgreSQL

Create a PostgreSQL database named `expense_analyzer`.

Create a virtual environment:

```powershell
python -m venv .venv
.venv\Scripts\activate
```

Install dependencies:

```powershell
pip install -r requirements.txt
```

Create `.env` from `.env.example` and update the PostgreSQL username/password.

Start the API:

```powershell
uvicorn app.main:app --reload
```

API: http://localhost:8000

Swagger UI: http://localhost:8000/docs

## Option B — Run everything with Docker

```bash
docker compose up --build
```

API: http://localhost:8000

Swagger UI: http://localhost:8000/docs

## Main endpoints

### Authentication

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

### Categories

```text
GET  /api/v1/categories
POST /api/v1/categories
```

### Expenses

```text
POST   /api/v1/expenses
GET    /api/v1/expenses
GET    /api/v1/expenses/{expense_id}
PUT    /api/v1/expenses/{expense_id}
DELETE /api/v1/expenses/{expense_id}
```

### Reports

```text
GET /api/v1/reports/dashboard
GET /api/v1/reports/summary?period=daily
GET /api/v1/reports/summary?period=weekly
GET /api/v1/reports/summary?period=monthly
```

You can also specify:

```text
?start_date=2026-10-01&end_date=2026-10-31
```

## Example register request

```json
{
  "email": "vignesh@example.com",
  "full_name": "Vignesh",
  "password": "Password@123"
}
```

## Example expense request

First get a category ID from `GET /api/v1/categories`, then:

```json
{
  "amount": 250.00,
  "category_id": 1,
  "description": "Lunch",
  "expense_date": "2026-10-03"
}
```

## Frontend integration

For React, store the returned JWT access token and send:

```text
Authorization: Bearer <access_token>
```

for protected API requests.

Suggested frontend pages:

- Login / Register
- Dashboard
- Add Expense
- Expense History
- Categories
- Daily Report
- Weekly Report
- Monthly Report
- Profile

The backend is designed so React can consume JSON responses directly and render charts using libraries such as Recharts.
