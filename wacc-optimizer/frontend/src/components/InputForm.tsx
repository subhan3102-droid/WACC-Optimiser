import { useEffect, useState } from "react";
import { api, IndustryData } from "../services/api";
import { FormValues } from "../types";

interface Props {
  onSubmit: (values: FormValues) => void;
  loading: boolean;
}

const DEFAULT: FormValues = {
  industry: "technology",
  riskFreeRate: "4.5",
  marketPremium: "5.5",
  taxRate: "25",
  equity: "500",
  debt: "200",
  countryRiskPremium: "0",
  debtPctMin: "0",
  debtPctMax: "80",
};

export default function InputForm({ onSubmit, loading }: Props) {
  const [values, setValues] = useState<FormValues>(DEFAULT);
  const [industries, setIndustries] = useState<Record<string, IndustryData>>({});

  useEffect(() => {
    api.getIndustries().then(setIndustries).catch(console.error);
  }, []);

  const set = (k: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  const ind = industries[values.industry];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Industry */}
      <div>
        <label className="field-label">Industry</label>
        <select value={values.industry} onChange={set("industry")} className="input w-full">
          {Object.entries(industries).map(([key, d]) => (
            <option key={key} value={key}>{d.name}</option>
          ))}
        </select>
        {ind && (
          <p className="mt-1 text-xs text-neutral-400 tabular-nums">
            β<sub>u</sub> {ind.beta_unlevered_low}–{ind.beta_unlevered_high} · typical D/E {ind.typical_de_ratio_min}×–{ind.typical_de_ratio_max}×
          </p>
        )}
      </div>

      {/* Market params */}
      <div>
        <p className="section-sublabel">Market parameters</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="field-label">Risk-free rate</label>
            <div className="input-wrap">
              <input type="number" value={values.riskFreeRate} onChange={set("riskFreeRate")}
                step="0.1" min="0" max="25" className="input w-full pr-6" />
              <span className="input-unit">%</span>
            </div>
          </div>
          <div>
            <label className="field-label">Market premium</label>
            <div className="input-wrap">
              <input type="number" value={values.marketPremium} onChange={set("marketPremium")}
                step="0.1" min="0" max="30" className="input w-full pr-6" />
              <span className="input-unit">%</span>
            </div>
          </div>
          <div>
            <label className="field-label">Country risk</label>
            <div className="input-wrap">
              <input type="number" value={values.countryRiskPremium} onChange={set("countryRiskPremium")}
                step="0.1" min="0" max="20" className="input w-full pr-6" />
              <span className="input-unit">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Capital structure */}
      <div>
        <p className="section-sublabel">Capital structure ($M)</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Equity</label>
            <input type="number" value={values.equity} onChange={set("equity")}
              min="1" className="input w-full" />
          </div>
          <div>
            <label className="field-label">Debt</label>
            <input type="number" value={values.debt} onChange={set("debt")}
              min="0" className="input w-full" />
          </div>
        </div>
      </div>

      {/* Tax + simulation */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Tax rate</label>
          <div className="input-wrap">
            <input type="number" value={values.taxRate} onChange={set("taxRate")}
              step="0.5" min="0" max="60" className="input w-full pr-6" />
            <span className="input-unit">%</span>
          </div>
        </div>
        <div>
          <label className="field-label">Sim range max</label>
          <div className="input-wrap">
            <input type="number" value={values.debtPctMax} onChange={set("debtPctMax")}
              step="5" min="20" max="95" className="input w-full pr-6" />
            <span className="input-unit">%</span>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="run-btn w-full"
      >
        {loading ? "Running…" : "Run Analysis"}
      </button>
    </form>
  );
}
