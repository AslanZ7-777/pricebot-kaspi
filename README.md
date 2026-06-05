# PriceBot — Automated Price Monitor for Kaspi.kz

Automated competitive price monitoring and repricing system. Tracks competitor prices on Kaspi.kz using browser automation (Playwright), auto-lowers your price by a configured step when undercut, and never drops below your floor price.

## Features

- **Real-time monitoring** — Playwright-powered scraping, no API required
- **Auto-repricing** — configurable step + floor price per product
- **Analytics** — win rate trends, competitor aggression scoring, 30-day history
- **WebSocket notifications** — instant alerts on every price change
- **Demo mode** — seed realistic demo data with one click

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | React 18 + TypeScript + Vite + TanStack Router + Recharts |
| Backend | FastAPI + SQLAlchemy 2 async + Alembic |
| Browser | Playwright async pool (stealth, anti-bot) |
| Queue | Celery 5 + Celery Beat |
| DB | PostgreSQL 17 |
| Cache/Pub-sub | Redis |

## Quick Start

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Environment

Copy `frontend/.env.example` to `frontend/.env.local` and set:

```
VITE_API_BASE_URL=   # empty for local dev (Vite proxy handles it)
```

For production deployment on Vercel, set `VITE_API_BASE_URL` to your backend URL.
