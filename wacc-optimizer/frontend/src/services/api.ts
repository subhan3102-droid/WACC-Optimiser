const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface WaccRequest {
  industry: string;
  risk_free_rate: number;
  market_premium: number;
  tax_rate: number;
  equity: number;
  debt: number;
  country_risk_premium?: number;
  debt_pct_min?: number;
  debt_pct_max?: number;
  debt_pct_step?: number;
}

export interface WaccCurve {
  debt_pct: number[];
  wacc: number[];
  cost_of_equity: number[];
  cost_of_debt: number[];
  beta: number[];
  risk: string[];
}

export interface RiskZone {
  from: number;
  to: number;
  label: "SAFE" | "MODERATE" | "RISKY";
}

export interface WaccResponse {
  wacc_curve: WaccCurve;
  risk_zones: RiskZone[];
  optimal_range: { min: number; max: number; wacc_at_min: number };
  current_structure: { debt_pct: number; equity_pct: number };
  industry_meta: { name: string; beta_unlevered: number };
}

export interface IndustryData {
  name: string;
  beta_unlevered_low: number;
  beta_unlevered_avg: number;
  beta_unlevered_high: number;
  typical_de_ratio_min: number;
  typical_de_ratio_max: number;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  getIndustries: () => request<Record<string, IndustryData>>("/industries"),
  calculateWacc: (body: WaccRequest) =>
    request<WaccResponse>("/calculate-wacc", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
