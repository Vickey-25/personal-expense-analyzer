# ExpenseFlow — Personal Expense Analyzer Frontend

Premium React/Vite frontend for the FastAPI + PostgreSQL backend.

## Included screens

- Login / Register
- Overview dashboard
- Expense CRUD
- Date/category filtering
- Daily / weekly / monthly analytics
- Category breakdown
- Category management
- Profile / logout
- Responsive mobile sidebar
- Animated premium glassmorphism UI

## API connection

Create `.env` from `.env.example`:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

## Run

```powershell
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## Build

```powershell
npm run build
```

The frontend expects the FastAPI backend to be running on port `8000`.

## Backend endpoints used

```text
POST /auth/register
POST /auth/login
GET  /auth/me

GET  /categories
POST /categories

GET    /expenses
POST   /expenses
PUT    /expenses/{expense_id}
DELETE /expenses/{expense_id}

GET /reports/dashboard
GET /reports/summary?period=daily
GET /reports/summary?period=weekly
GET /reports/summary?period=monthly
```

## Notes

Authentication is handled by storing the JWT access token in `localStorage` and sending it in the `Authorization: Bearer <token>` header for protected requests.

The frontend uses only React + Vite; charts are rendered with lightweight SVG/CSS so there are no chart-library dependencies to install.
