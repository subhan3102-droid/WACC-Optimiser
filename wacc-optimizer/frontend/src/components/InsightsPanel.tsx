import { WaccResponse } from "../services/api";

interface Props {
  data: WaccResponse;
}

const riskColor: Record<string, string> = {
  SAFE: "text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950",
  MODERATE: "text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950",
  RISKY: "text-red-600 bg-red-50 dark:text-red-300 dark:bg-red-950",
};

function Dot({ color }: { color: "green" | "amber" | "red" }) {
  const cls = { green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500" }[color];
  return <span className={`inline-block w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${cls}`} />;
}

export default function InsightsPanel({ data }: Props) {
  const { optimal_range, current_structure, wacc_curve, risk_zones, industry_meta } = data;

  const minWacc = optimal_range.wacc_at_min;
  const curPct = current_structure.debt_pct;

  // Find WACC at current structure
  const curIdx = wacc_curve.debt_pct.reduce((best, dp, i) =>
    Math.abs(dp - curPct) < Math.abs(wacc_curve.debt_pct[best] - curPct) ? i : best, 0);
  const curWacc = wacc_curve.wacc[curIdx];
  const diff = +(curWacc - minWacc).toFixed(2);

  const riskyZone = risk_zones.find((z) => z.label === "RISKY");
  const currentRisk = wacc_curve.risk[curIdx];

  return (
    <div className="space-y-4">
      {/* Key metrics row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Min WACC", value: `${minWacc.toFixed(2)}%`, sub: `at ${optimal_range.min}–${optimal_range.max}% debt` },
          { label: "Current WACC", value: `${curWacc.toFixed(2)}%`, sub: `${curPct.toFixed(1)}% debt today` },
          { label: "Unlevered β", value: industry_meta.beta_unlevered.toFixed(2), sub: industry_meta.name },
          { label: "Current risk", value: currentRisk, sub: "classification", badge: true },
        ].map((m) => (
          <div key={m.label} className="metric-card">
            <p className="metric-label">{m.label}</p>
            {m.badge ? (
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mt-1 ${riskColor[m.value] || ""}`}>
                {m.value}
              </span>
            ) : (
              <p className="metric-value">{m.value}</p>
            )}
            <p className="metric-sub">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Insights */}
      <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2.5">
        <p className="section-sublabel">Key insights</p>

        <div className="flex gap-2">
          <Dot color="green" />
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Optimal debt range is <span className="font-medium text-neutral-900 dark:text-white">{optimal_range.min}%–{optimal_range.max}%</span> of total capital,
            minimizing WACC at <span className="font-medium text-neutral-900 dark:text-white">{minWacc.toFixed(2)}%</span>.
          </p>
        </div>

        <div className="flex gap-2">
          <Dot color={diff > 0.5 ? "amber" : "green"} />
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            {diff > 0.1 ? (
              <>Current structure is <span className="font-medium text-neutral-900 dark:text-white">{diff}pp above</span> the minimum WACC.{" "}
              {curPct < optimal_range.min
                ? "Increasing leverage modestly could reduce cost of capital."
                : curPct > optimal_range.max
                ? "Reducing debt toward the optimal range would lower WACC."
                : "Structure is near optimal — minor adjustments may help."}</>
            ) : (
              <>Current structure is within the optimal range — capital allocation looks efficient.</>
            )}
          </p>
        </div>

        {riskyZone && (
          <div className="flex gap-2">
            <Dot color="red" />
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Risk escalates sharply beyond <span className="font-medium text-neutral-900 dark:text-white">{riskyZone.from}% debt</span>. Beta and credit spreads increase non-linearly above this threshold.
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Dot color="amber" />
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            The blue band on the chart marks the optimal range. Background shading indicates risk zones: green (safe), amber (moderate), red (risky).
          </p>
        </div>
      </div>
    </div>
  );
}
