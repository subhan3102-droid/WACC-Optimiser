from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import numpy as np
import json
import os

app = FastAPI(title="WACC Optimizer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Industry dataset — swap this JSON file to update without touching code
# ---------------------------------------------------------------------------
INDUSTRIES = {
    "technology": {
        "name": "Technology",
        "beta_unlevered_low": 0.85,
        "beta_unlevered_avg": 1.10,
        "beta_unlevered_high": 1.45,
        "typical_de_ratio_min": 0.05,
        "typical_de_ratio_max": 0.30,
    },
    "retail": {
        "name": "Retail",
        "beta_unlevered_low": 0.65,
        "beta_unlevered_avg": 0.85,
        "beta_unlevered_high": 1.10,
        "typical_de_ratio_min": 0.20,
        "typical_de_ratio_max": 0.60,
    },
    "manufacturing": {
        "name": "Manufacturing",
        "beta_unlevered_low": 0.70,
        "beta_unlevered_avg": 0.92,
        "beta_unlevered_high": 1.20,
        "typical_de_ratio_min": 0.25,
        "typical_de_ratio_max": 0.70,
    },
    "utilities": {
        "name": "Utilities",
        "beta_unlevered_low": 0.28,
        "beta_unlevered_avg": 0.38,
        "beta_unlevered_high": 0.52,
        "typical_de_ratio_min": 0.60,
        "typical_de_ratio_max": 1.40,
    },
    "healthcare": {
        "name": "Healthcare",
        "beta_unlevered_low": 0.60,
        "beta_unlevered_avg": 0.80,
        "beta_unlevered_high": 1.05,
        "typical_de_ratio_min": 0.10,
        "typical_de_ratio_max": 0.40,
    },
    "financials": {
        "name": "Financials",
        "beta_unlevered_low": 0.45,
        "beta_unlevered_avg": 0.65,
        "beta_unlevered_high": 0.90,
        "typical_de_ratio_min": 1.00,
        "typical_de_ratio_max": 3.00,
    },
    "energy": {
        "name": "Energy",
        "beta_unlevered_low": 0.75,
        "beta_unlevered_avg": 1.00,
        "beta_unlevered_high": 1.30,
        "typical_de_ratio_min": 0.30,
        "typical_de_ratio_max": 0.80,
    },
    "real_estate": {
        "name": "Real Estate",
        "beta_unlevered_low": 0.55,
        "beta_unlevered_avg": 0.72,
        "beta_unlevered_high": 0.95,
        "typical_de_ratio_min": 0.80,
        "typical_de_ratio_max": 2.00,
    },
}


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class WaccRequest(BaseModel):
    industry: str
    risk_free_rate: float = Field(..., ge=0, le=0.25, description="e.g. 0.045 for 4.5%")
    market_premium: float = Field(..., ge=0, le=0.30)
    tax_rate: float = Field(..., ge=0, le=0.60)
    equity: float = Field(..., gt=0, description="Total equity in $M")
    debt: float = Field(..., ge=0, description="Total debt in $M")
    country_risk_premium: Optional[float] = Field(default=0.0, ge=0, le=0.20)
    debt_pct_min: Optional[float] = Field(default=0.0, ge=0, le=100)
    debt_pct_max: Optional[float] = Field(default=80.0, ge=0, le=100)
    debt_pct_step: Optional[float] = Field(default=2.0, ge=0.5, le=10)


# ---------------------------------------------------------------------------
# Financial model helpers
# ---------------------------------------------------------------------------
def get_credit_spread(de_ratio: float) -> float:
    """Non-linear credit spread that increases with leverage."""
    thresholds = [
        (0.30, 0.008),
        (0.60, 0.014),
        (1.00, 0.022),
        (1.50, 0.035),
        (2.50, 0.055),
        (float("inf"), 0.085),
    ]
    for limit, spread in thresholds:
        if de_ratio < limit:
            return spread
    return 0.085


def classify_risk(beta: float, de_ratio: float) -> str:
    if de_ratio < 0.5 and beta < 1.2:
        return "SAFE"
    if de_ratio < 1.0 and beta < 1.8:
        return "MODERATE"
    return "RISKY"


def compute_risk_zones(debt_pcts, risk_labels):
    """Collapse the per-point risk array into contiguous zone spans."""
    zones = []
    if not risk_labels:
        return zones
    current = risk_labels[0]
    start = debt_pcts[0]
    for i in range(1, len(risk_labels)):
        if risk_labels[i] != current:
            zones.append({"from": start, "to": debt_pcts[i - 1], "label": current})
            current = risk_labels[i]
            start = debt_pcts[i]
    zones.append({"from": start, "to": debt_pcts[-1], "label": current})
    return zones


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/industries")
def get_industries():
    return {
        key: {
            "name": v["name"],
            "beta_unlevered_low": v["beta_unlevered_low"],
            "beta_unlevered_avg": v["beta_unlevered_avg"],
            "beta_unlevered_high": v["beta_unlevered_high"],
            "typical_de_ratio_min": v["typical_de_ratio_min"],
            "typical_de_ratio_max": v["typical_de_ratio_max"],
        }
        for key, v in INDUSTRIES.items()
    }


@app.post("/calculate-wacc")
def calculate_wacc(req: WaccRequest):
    if req.industry not in INDUSTRIES:
        raise HTTPException(status_code=400, detail=f"Unknown industry: {req.industry}")

    if req.debt_pct_min >= req.debt_pct_max:
        raise HTTPException(status_code=400, detail="debt_pct_min must be less than debt_pct_max")

    ind = INDUSTRIES[req.industry]
    bu = ind["beta_unlevered_avg"]
    t = req.tax_rate
    rf = req.risk_free_rate
    erp = req.market_premium
    crp = req.country_risk_premium or 0.0

    # Simulation range
    debt_pcts = list(
        np.arange(req.debt_pct_min, req.debt_pct_max + req.debt_pct_step, req.debt_pct_step)
    )
    debt_pcts = [round(float(d), 2) for d in debt_pcts if d <= req.debt_pct_max + 1e-9]

    wacc_list, coe_list, cod_list, beta_list, risk_list = [], [], [], [], []

    for dp in debt_pcts:
        d_ratio = dp / 100
        e_ratio = 1.0 - d_ratio

        if e_ratio == 0:
            e_ratio = 1e-9  # guard

        de = d_ratio / e_ratio

        # Hamada equation — levered beta
        bl = bu * (1 + (1 - t) * de)

        # CAPM cost of equity
        re = rf + bl * erp + crp

        # Risk-adjusted cost of debt
        spread = get_credit_spread(de)
        rd = rf + spread

        # WACC
        wacc = e_ratio * re + d_ratio * rd * (1 - t)

        risk = classify_risk(bl, de)

        wacc_list.append(round(wacc * 100, 4))
        coe_list.append(round(re * 100, 4))
        cod_list.append(round(rd * 100, 4))
        beta_list.append(round(float(bl), 4))
        risk_list.append(risk)

    # Optimal range: tight band centred on WACC minimum
    min_wacc = min(wacc_list)
    min_idx = wacc_list.index(min_wacc)
    opt_debt = debt_pcts[min_idx]
    opt_min = round(max(0, opt_debt - 6), 1)
    opt_max = round(min(req.debt_pct_max, opt_debt + 6), 1)

    risk_zones = compute_risk_zones(debt_pcts, risk_list)

    # Current structure metrics
    total_v = req.equity + req.debt
    cur_debt_pct = round(req.debt / total_v * 100, 2) if total_v > 0 else 0

    return {
        "wacc_curve": {
            "debt_pct": debt_pcts,
            "wacc": wacc_list,
            "cost_of_equity": coe_list,
            "cost_of_debt": cod_list,
            "beta": beta_list,
            "risk": risk_list,
        },
        "risk_zones": risk_zones,
        "optimal_range": {"min": opt_min, "max": opt_max, "wacc_at_min": round(min_wacc, 4)},
        "current_structure": {
            "debt_pct": cur_debt_pct,
            "equity_pct": round(100 - cur_debt_pct, 2),
        },
        "industry_meta": {
            "name": ind["name"],
            "beta_unlevered": bu,
        },
    }


@app.get("/health")
def health():
    return {"status": "ok"}
