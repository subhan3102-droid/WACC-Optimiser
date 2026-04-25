# WACC Optimizer

A production-ready financial analytics web application that calculates and visualizes risk-adjusted Weighted Average Cost of Capital (WACC) across simulated capital structures.

## What it does

- Simulates WACC across 0–80% debt/capital ratios
- Dynamically adjusts levered beta (Hamada equation), cost of equity (CAPM), and cost of debt (non-linear credit spreads)
- Classifies risk zones: SAFE / MODERATE / RISKY
- Identifies the optimal debt range that minimizes WACC
- Interactive Plotly chart with hover tooltips

---

## Project Structure

```
wacc-optimizer/
├── backend/          # FastAPI + Python financial model
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/         # React + Vite + Tailwind + Plotly
│   ├── src/
│   │   ├── components/   InputForm, WaccChart, InsightsPanel
│   │   ├── pages/        Dashboard
│   │   ├── services/     api.ts
│   │   └── types/
│   ├── Dockerfile
│   └── nginx.conf
└── docker-compose.yml
```

---

## Option A — Run locally (fastest)

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

API running at → http://localhost:8000  
Docs at → http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App running at → http://localhost:5173

---

## Option B — Docker (recommended for sharing)

```bash
# From project root
docker compose up --build
```

- Frontend → http://localhost:80
- Backend API → http://localhost:8000

---

## Option C — Deploy to the web

### Backend: Railway (free tier available)

1. Push the `backend/` folder to a GitHub repo
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Copy the generated URL (e.g. `https://wacc-api.up.railway.app`)

### Frontend: Vercel (free)

1. Push the `frontend/` folder to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import repo
3. Set environment variable: `VITE_API_URL=https://your-railway-url.up.railway.app`
4. Deploy — Vercel auto-detects Vite

### Backend: Render (alternative)

1. New Web Service → connect repo
2. Build command: `pip install -r requirements.txt`
3. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

---

## Financial Model

### WACC
```
WACC = (E/V × Re) + (D/V × Rd × (1 − t))
```

### Cost of Equity (CAPM)
```
Re = Rf + βL × ERP + CRP
```

### Levered Beta (Hamada)
```
βL = βU × (1 + (1 − t) × D/E)
```

### Cost of Debt
```
Rd = Rf + credit_spread(D/E)
```
Credit spread increases non-linearly at D/E thresholds: 0.3×, 0.6×, 1.0×, 1.5×, 2.5×

### Risk Classification
| Condition | Level |
|---|---|
| D/E < 0.5 and β < 1.2 | SAFE |
| D/E < 1.0 and β < 1.8 | MODERATE |
| Otherwise | RISKY |

---

## Industries

| Industry | βU avg | Typical D/E |
|---|---|---|
| Technology | 1.10 | 0.05–0.30× |
| Retail | 0.85 | 0.20–0.60× |
| Manufacturing | 0.92 | 0.25–0.70× |
| Utilities | 0.38 | 0.60–1.40× |
| Healthcare | 0.80 | 0.10–0.40× |
| Financials | 0.65 | 1.00–3.00× |
| Energy | 1.00 | 0.30–0.80× |
| Real Estate | 0.72 | 0.80–2.00× |

To add industries, edit the `INDUSTRIES` dict in `backend/main.py`.

---

## API Reference

### GET /industries
Returns all available industries with beta ranges.

### POST /calculate-wacc
```json
{
  "industry": "technology",
  "risk_free_rate": 0.045,
  "market_premium": 0.055,
  "tax_rate": 0.25,
  "equity": 500,
  "debt": 200,
  "country_risk_premium": 0.0,
  "debt_pct_min": 0,
  "debt_pct_max": 80,
  "debt_pct_step": 2
}
```

Returns:
```json
{
  "wacc_curve": { "debt_pct": [...], "wacc": [...], "cost_of_equity": [...], ... },
  "risk_zones": [{"from": 0, "to": 30, "label": "SAFE"}, ...],
  "optimal_range": {"min": 20, "max": 36, "wacc_at_min": 8.42},
  "current_structure": {"debt_pct": 28.6, "equity_pct": 71.4},
  "industry_meta": {"name": "Technology", "beta_unlevered": 1.1}
}
```

---

## Customization

- **Add industries**: Edit `INDUSTRIES` dict in `backend/main.py`
- **Change credit spread curve**: Edit `get_credit_spread()` in `backend/main.py`
- **Risk thresholds**: Edit `classify_risk()` in `backend/main.py`
- **Chart styling**: Edit `WaccChart.tsx` — uses Plotly.js
- **Design tokens**: Edit `src/index.css`

---

## License

MIT
