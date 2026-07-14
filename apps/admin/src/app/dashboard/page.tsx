"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./Dashboard.module.css";
import MetricCard from "@/components/MetricCard/MetricCard";
import { api } from "@/lib/api";

function formatIsk(n: number): string {
  return `${Math.round(n).toLocaleString()} ISK`;
}

function ActionCard(props: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
  href?: string;
}) {
  const { label, value, sub, accent, href } = props;
  const card = (
    <div
      className={`${styles.actionCard} ${href ? styles.actionCardLink : ""}`}
      style={{ borderTopColor: accent }}
    >
      <span className={styles.actionCardLabel}>{label}</span>
      <span className={styles.actionCardValue}>{value}</span>
      {sub && <span className={styles.actionCardSub}>{sub}</span>}
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

function ProportionBar(props: {
  segments: { label: string; value: number; color: string }[];
}) {
  const { segments } = props;
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  let cursor = 0;
  const rects =
    total === 0 ? (
      <rect x={0} y={0} width={1000} height={28} style={{ fill: "var(--hairline)" }} />
    ) : (
      segments.map((s) => {
        const width = (s.value / total) * 1000;
        const rect = (
          <rect
            key={s.label}
            x={cursor}
            y={0}
            width={width}
            height={28}
            style={{ fill: s.color }}
          />
        );
        cursor += width;
        return rect;
      })
    );

  return (
    <div className={styles.barWrapper}>
      <div className={styles.barTrack}>
        <svg
          viewBox="0 0 1000 28"
          preserveAspectRatio="none"
          className={styles.barSvg}
        >
          {rects}
        </svg>
      </div>
      <div className={styles.barLegend}>
        {segments.map((s) => (
          <span key={s.label} className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{ background: s.color }}
            />
            {s.label}: {s.value.toLocaleString()}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    api
      .getStats()
      .then(({ data }) => setStats(data))
      .catch(() => {});
  }, []);

  const outstandingCount = stats?.outstandingCount ?? 0;
  const inProgressCount = stats?.inProgressCount ?? 0;
  const completedTotal = stats?.completedTotal ?? 0;
  const avgCompletionHours = Math.round(
    (stats?.avgCompletionSeconds7d ?? 0) / 3600,
  );
  const revenueLifetime = stats?.revenueLifetime ?? 0;

  const pendingBuybackContracts = stats?.pendingBuybackContracts ?? 0;
  const pendingBuybackValue = stats?.pendingBuybackValue ?? 0;
  const matchedBuybackContracts = stats?.matchedBuybackContracts ?? 0;
  const expiredBuybackContracts = stats?.expiredBuybackContracts ?? 0;
  const discrepancyCount = stats?.discrepancyCount ?? 0;
  const itemsWithPendingRecommendation =
    stats?.itemsWithPendingRecommendation ?? 0;

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Hauling</h2>

        <div className={styles.actionRow}>
          <ActionCard
            label="Outstanding Contracts"
            value={outstandingCount.toLocaleString()}
            accent="var(--danger)"
          />
        </div>

        <div className={styles.metrics}>
          <MetricCard name="In Progress" value={inProgressCount} />
          <MetricCard name="Completed" value={completedTotal} />
          <MetricCard name="Avg Time To Complete" value={avgCompletionHours} />
          <MetricCard name="Revenue" value={revenueLifetime} />
        </div>

        <ProportionBar
          segments={[
            { label: "Outstanding", value: outstandingCount, color: "var(--danger)" },
            { label: "In Progress", value: inProgressCount, color: "var(--warning)" },
            { label: "Completed", value: completedTotal, color: "var(--success)" },
          ]}
        />
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Buyback</h2>

        <div className={styles.actionRow}>
          <ActionCard
            label="Pending Contracts"
            value={pendingBuybackContracts.toLocaleString()}
            sub={formatIsk(pendingBuybackValue)}
            accent="var(--danger)"
            href="/buyback-quotes"
          />
          <ActionCard
            label="Items Needing Rate Review"
            value={itemsWithPendingRecommendation.toLocaleString()}
            accent="var(--warning)"
            href="/buyback-pricing"
          />
          <ActionCard
            label="Discrepancies"
            value={discrepancyCount.toLocaleString()}
            accent="var(--warning)"
            href="/buyback-quotes"
          />
        </div>

        <div className={styles.metrics}>
          <MetricCard name="Matched Contracts" value={matchedBuybackContracts} />
        </div>

        <ProportionBar
          segments={[
            { label: "Pending", value: pendingBuybackContracts, color: "var(--danger)" },
            { label: "Matched", value: matchedBuybackContracts, color: "var(--success)" },
            { label: "Expired", value: expiredBuybackContracts, color: "var(--muted)" },
          ]}
        />
      </div>
    </div>
  );
}
