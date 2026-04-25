import { useState } from "react";
import InputForm from "../components/InputForm";
import WaccChart from "../components/WaccChart";
import InsightsPanel from "../components/InsightsPanel";
import { api, WaccResponse } from "../services/api";
import { FormValues } from "../types";

export default function Dashboard() {
  const [result, setResult] = useState<WaccResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: FormValues) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.calculateWacc({
        industry: values.industry,
        risk_free_rate: parseFloat(values.riskFreeRate) / 100,
        market_premium: parseFloat(values.marketPremium) / 100,
        tax_rate: parseFloat(values.taxRate) / 100,
        equity: parseFloat(values.equity),
        debt: parseFloat(values.debt),
        country_risk_premium: parseFloat(values.countryRiskPremium || "0") / 100,
        debt_pct_min: parseFloat(values.debtPctMin || "0"),
        debt_pct_max: parseFloat(values.debtPctMax || "80"),
        debt_pct_step: 2,
      });
      setResult(res);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-base font-medium tracking-tight text-neutral-900 dark:text-white">
              WACC Optimizer
            </span>
            <span className="hidden sm:inline text-xs text-neutral-400 font-mono">
              capital structure analyzer
            </span>
          </div>
          <span className="text-xs text-neutral-400 font-mono">v1.0</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
          {/* Input panel */}
          <aside>
            <div className="card sticky top-6">
              <p className="section-sublabel mb-4">Configuration</p>
              <InputForm onSubmit={handleSubmit} loading={loading} />
            </div>
          </aside>

          {/* Visualization panel */}
          <div className="space-y-4">
            {error && (
              <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            {!result && !loading && (
              <div className="card flex items-center justify-center h-64 text-sm text-neutral-400 border-dashed">
                Configure inputs and run analysis →
              </div>
            )}

            {loading && (
              <div className="card flex items-center justify-center h-64 text-sm text-neutral-400">
                <span className="animate-pulse">Running simulation…</span>
              </div>
            )}

            {result && !loading && (
              <>
                <div className="card">
                  <p className="section-sublabel mb-3">WACC across capital structures</p>
                  <WaccChart data={result} />
                </div>
                <div className="card">
                  <InsightsPanel data={result} />
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
