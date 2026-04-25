export type RiskLevel = "SAFE" | "MODERATE" | "RISKY";

export interface FormValues {
  industry: string;
  riskFreeRate: string;
  marketPremium: string;
  taxRate: string;
  equity: string;
  debt: string;
  countryRiskPremium: string;
  debtPctMin: string;
  debtPctMax: string;
}
