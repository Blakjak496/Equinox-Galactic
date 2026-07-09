"use client";

import styles from "./Dashboard.module.css";
import { useEffect, useState } from "react";
import MetricCard from "@/components/MetricCard/MetricCard";
import { api } from "@/lib/api";

export default function Dashboard() {
  const [outstandingContractsTotal, setOutstandingContractsTotal] =
    useState<number>(0);
  const [contractsInProgressTotal, setContractsInProgressTotal] =
    useState<number>(0);
  const [avgCompletionTime, setAvgCompletionTime] = useState<number>(0);
  const [completedContractsTotal, setCompletedContractsTotal] =
    useState<number>(0);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);

  useEffect(() => {
    api
      .getStats()
      .then(({ data }) => {
        setOutstandingContractsTotal(data.outstandingCount ?? 0);
        setContractsInProgressTotal(data.inProgressCount ?? 0);
        setAvgCompletionTime(
          Math.round((data.avgCompletionSeconds7d ?? 0) / 3600),
        );
        setCompletedContractsTotal(data.completedTotal ?? 0);
        setTotalRevenue(data.revenueLifetime ?? 0);
      })
      .catch(() => {});
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.metrics}>
        <MetricCard name="Outstanding" value={outstandingContractsTotal} />
        <MetricCard name="In Progress" value={contractsInProgressTotal} />
        <MetricCard name="Completed" value={completedContractsTotal} />
        <MetricCard name="Avg Time To Complete" value={avgCompletionTime} />
        <MetricCard name="Revenue" value={totalRevenue} />
      </div>
    </div>
  );
}
