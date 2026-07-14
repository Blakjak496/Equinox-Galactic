"use client";

import {
  Chart as ChartJS,
  BarController,
  LineController,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  TooltipItem,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import { TrendPoint } from "@/lib/api";
import styles from "./TrendChart.module.css";

ChartJS.register(
  BarController,
  LineController,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
);

const COLOR_PRIMARY = "rgb(168, 34, 34)";
const COLOR_WARNING = "rgb(196, 149, 79)";
const COLOR_MUTED = "rgb(150, 152, 152)";
const COLOR_HAIRLINE = "rgba(255, 255, 255, 0.12)";

function compactNumber(n: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

function formatShortDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString(undefined, {
    month: "numeric",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function TrendChart(props: {
  data: TrendPoint[];
  countLabel: string;
  valueLabel: string;
  valueFormatter?: (value: number) => string;
}) {
  const { data, countLabel, valueLabel, valueFormatter } = props;

  const chartData = {
    labels: data.map((d) => formatShortDate(d.date)),
    datasets: [
      {
        type: "bar" as const,
        label: countLabel,
        data: data.map((d) => d.count),
        backgroundColor: COLOR_PRIMARY,
        borderRadius: 3,
        yAxisID: "y",
        order: 2,
      },
      {
        type: "line" as const,
        label: valueLabel,
        data: data.map((d) => d.value),
        borderColor: COLOR_WARNING,
        backgroundColor: COLOR_WARNING,
        pointRadius: 2,
        pointHoverRadius: 4,
        tension: 0.3,
        yAxisID: "y1",
        order: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: {
        labels: { color: COLOR_MUTED, boxWidth: 12, font: { size: 11 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<"bar" | "line">) => {
            const raw = ctx.parsed.y ?? 0;
            if (ctx.dataset.yAxisID === "y1") {
              return `${ctx.dataset.label}: ${valueFormatter ? valueFormatter(raw) : raw}`;
            }
            return `${ctx.dataset.label}: ${raw}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: COLOR_MUTED,
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        },
        grid: { color: COLOR_HAIRLINE },
      },
      y: {
        position: "left" as const,
        beginAtZero: true,
        ticks: { color: COLOR_MUTED, precision: 0 },
        grid: { color: COLOR_HAIRLINE },
      },
      y1: {
        position: "right" as const,
        beginAtZero: true,
        ticks: {
          color: COLOR_MUTED,
          maxTicksLimit: 6,
          callback: (v: string | number) => compactNumber(Number(v)),
        },
        grid: { display: false },
      },
    },
  };

  return (
    <div className={styles.chartWrapper}>
      <Chart type="bar" data={chartData} options={options} />
    </div>
  );
}
