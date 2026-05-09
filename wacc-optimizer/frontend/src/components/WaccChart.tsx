import { useEffect, useRef } from "react";
import { WaccResponse } from "../services/api";

interface Props {
  data: WaccResponse;
}

declare global {
  interface Window { Plotly: any; }
}

export default function WaccChart({ data }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !window.Plotly) return;
    const { wacc_curve, risk_zones, optimal_range } = data;

    const zoneColors: Record<string, string> = {
      SAFE: "rgba(45,157,110,0.08)",
      MODERATE: "rgba(184,115,18,0.10)",
      RISKY: "rgba(194,59,59,0.10)",
    };

    const shapes: any[] = [
      // Risk zone bands
      ...risk_zones.map((z) => ({
        type: "rect", xref: "x", yref: "paper",
        x0: z.from, x1: z.to, y0: 0, y1: 1,
        fillcolor: zoneColors[z.label] || "transparent",
        line: { width: 0 },
        layer: "below",
      })),
      // Optimal range — left border line only
      {
        type: "line", xref: "x", yref: "paper",
        x0: optimal_range.min, x1: optimal_range.min, y0: 0, y1: 1,
        line: { color: "rgba(61,130,196,0.6)", width: 1.5, dash: "dot" },
      },
      // Optimal range — right border line only
      {
        type: "line", xref: "x", yref: "paper",
        x0: optimal_range.max, x1: optimal_range.max, y0: 0, y1: 1,
        line: { color: "rgba(61,130,196,0.6)", width: 1.5, dash: "dot" },
      },
      // Optimal range — subtle fill
      {
        type: "rect", xref: "x", yref: "paper",
        x0: optimal_range.min, x1: optimal_range.max, y0: 0, y1: 1,
        fillcolor: "rgba(61,130,196,0.06)",
        line: { width: 0 },
        layer: "below",
      },
    ];

    const annotations: any[] = [
      {
        xref: "x", yref: "paper",
        x: (optimal_range.min + optimal_range.max) / 2, y: 0.97,
        text: "optimal range",
        showarrow: false,
        font: { size: 10, color: "rgba(61,130,196,0.8)" },
      },
    ];

    const customdata = wacc_curve.debt_pct.map((_, i) => [
      wacc_curve.cost_of_equity[i],
      wacc_curve.cost_of_debt[i],
      wacc_curve.beta[i],
      wacc_curve.risk[i],
    ]);

    const traces = [
      {
        x: wacc_curve.debt_pct,
        y: wacc_curve.wacc,
        customdata,
        name: "WACC",
        type: "scatter", mode: "lines",
        line: { color: "#3d82c4", width: 2.5, shape: "spline", smoothing: 1.2 },
        hovertemplate:
          "<b>Debt: %{x}%</b><br>" +
          "WACC: %{y:.2f}%<br>" +
          "Cost of equity: %{customdata[0]:.2f}%<br>" +
          "Cost of debt: %{customdata[1]:.2f}%<br>" +
          "Beta: %{customdata[2]:.2f}<br>" +
          "Risk: %{customdata[3]}<extra></extra>",
      },
      {
        x: wacc_curve.debt_pct,
        y: wacc_curve.cost_of_equity,
        name: "Cost of equity",
        type: "scatter", mode: "lines",
        line: { color: "#2d9d6e", width: 1.5, dash: "dot", shape: "spline", smoothing: 1.2 },
        hoverinfo: "skip",
      },
      {
        x: wacc_curve.debt_pct,
        y: wacc_curve.cost_of_debt,
        name: "Cost of debt (after-tax)",
        type: "scatter", mode: "lines",
        line: { color: "#c23b3b", width: 1.5, dash: "dash", shape: "spline", smoothing: 1.2 },
        hoverinfo: "skip",
      },
    ];

    const layout: any = {
      margin: { t: 10, r: 10, b: 50, l: 52 },
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
      font: { family: "'DM Sans', system-ui, sans-serif", size: 11 },
      shapes,
      annotations,
      legend: {
        x: 0.5, y: -0.18, xanchor: "center", yanchor: "top",
        orientation: "h",
        font: { size: 11 },
        bgcolor: "transparent",
      },
      xaxis: {
        title: { text: "Debt / total capital (%)", font: { size: 11 }, standoff: 10 },
        gridcolor: "rgba(128,128,128,0.08)",
        zeroline: false,
        tickfont: { size: 10 },
        ticksuffix: "%",
      },
      yaxis: {
        title: { text: "Cost (%)", font: { size: 11 }, standoff: 10 },
        gridcolor: "rgba(128,128,128,0.08)",
        zeroline: false,
        tickfont: { size: 10 },
        ticksuffix: "%",
      },
      hoverlabel: {
        bgcolor: "var(--color-bg)",
        bordercolor: "rgba(128,128,128,0.2)",
        font: { size: 12 },
      },
    };

    window.Plotly.react(ref.current, traces, layout, {
      responsive: true,
      displayModeBar: false,
    });
  }, [data]);

  return <div ref={ref} style={{ width: "100%", height: 320 }} />;
}
