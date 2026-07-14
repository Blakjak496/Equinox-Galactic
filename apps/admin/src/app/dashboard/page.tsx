"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Panel from "@/components/Panel/Panel";
import styles from "./Dashboard.module.css";
import MetricCard from "@/components/MetricCard/MetricCard";
import TrendChart from "@/components/TrendChart/TrendChart";
import { api, TrendPoint } from "@/lib/api";

function formatIsk(n: number): string {
  return `${Math.round(n).toLocaleString()} ISK`;
}

// No "ISK" suffix - the card label already says "Revenue", and the compact
// notation (e.g. 45.2B) is already tight against the card width at this
// font size without it.
function formatIskCompact(n: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
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
    <div className={styles.actionCard} style={{ borderTopColor: accent }}>
      <span className={styles.actionCardLabel}>{label}</span>
      <span className={styles.actionCardValue}>{value}</span>
      {sub && <span className={styles.actionCardSub}>{sub}</span>}
    </div>
  );
  return href ? (
    <Link href={href} className={styles.actionCardLink}>
      {card}
    </Link>
  ) : (
    card
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [trends, setTrends] = useState<{
    hauling: TrendPoint[];
    buyback: TrendPoint[];
  } | null>(null);

  useEffect(() => {
    api
      .getStats()
      .then(({ data }) => setStats(data))
      .catch(() => {});

    api
      .getStatsTrends()
      .then(({ data }) => setTrends(data))
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
          <MetricCard name="Revenue" value={formatIskCompact(revenueLifetime)} />
        </div>

        <Panel>
          <div className={styles.chartHeader}>
            <span className={styles.chartTitle}>
              Completed Contracts &amp; Revenue - Last 30 Days
            </span>
          </div>
          {trends ? (
            <TrendChart
              data={trends.hauling}
              countLabel="Completed"
              valueLabel="Revenue"
              valueFormatter={formatIsk}
            />
          ) : (
            <p className={styles.muted}>Loading…</p>
          )}
        </Panel>
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
          <MetricCard name="Expired Contracts" value={expiredBuybackContracts} />
        </div>

        <Panel>
          <div className={styles.chartHeader}>
            <span className={styles.chartTitle}>
              Quotes &amp; Quoted Value - Last 30 Days
            </span>
          </div>
          {trends ? (
            <TrendChart
              data={trends.buyback}
              countLabel="Quotes"
              valueLabel="Quoted Value"
              valueFormatter={formatIsk}
            />
          ) : (
            <p className={styles.muted}>Loading…</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
