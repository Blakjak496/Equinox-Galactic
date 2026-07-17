"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import { api, BuybackStockItem } from "@/lib/api";
import styles from "./BuybackStock.module.css";

const STALE_DAYS_THRESHOLD = 7;

function formatFreshness(dateStr: string | null): string {
  if (!dateStr) return "never";
  const hours = Math.round((Date.now() - new Date(dateStr).getTime()) / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function sittingDays(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

export default function BuybackStock() {
  const [items, setItems] = useState<BuybackStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncMessageIsError, setSyncMessageIsError] = useState(false);

  const fetchStock = () => {
    api
      .getBuybackStock()
      .then(({ data }) => setItems(data))
      .catch(() => setError("Failed to load buyback stock"))
      .finally(() => setLoading(false));
  };

  useEffect(fetchStock, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await api.runStockSync();
      if (!res.ok) {
        setSyncMessageIsError(true);
        setSyncMessage(res.message ?? "Sync failed");
      } else if (res.data) {
        setSyncMessageIsError(false);
        setSyncMessage(
          `Scanned ${res.data.assetsScanned} assets across ${res.data.hubLocationCount} hub location(s) - ${res.data.itemsChanged}/${res.data.itemsTotal} items changed (${res.data.durationSec.toFixed(1)}s).`,
        );
        fetchStock();
      }
    } catch {
      setSyncMessageIsError(true);
      setSyncMessage("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className={styles.container}>
      <Panel>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Buyback Stock</h2>
          <p className={styles.hint}>
            Live totals from the Division 6 hangar at configured stock
            locations. Available quantity already accounts for outstanding
            Purchase Stock orders. ESI caches hangar contents for 24h, so
            this normally only refreshes once a day - use the button below
            to check a fix without waiting for the next scheduled run.
          </p>

          <div className={styles.syncBar}>
            <Button callback={handleSync} color="orange" disabled={syncing}>
              {syncing ? "Syncing…" : "Run Sync Now"}
            </Button>
            {syncMessage && (
              <span
                className={syncMessageIsError ? styles.error : styles.success}
              >
                {syncMessage}
              </span>
            )}
          </div>

          {error && <p className={styles.error}>{error}</p>}

          {loading ? (
            <p className={styles.muted}>Loading…</p>
          ) : items.length === 0 ? (
            <p className={styles.muted}>No stock on hand.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Location</th>
                  <th>On Hand</th>
                  <th>Available</th>
                  <th>Updated</th>
                  <th>Sitting</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const days = sittingDays(item.oldestUnsoldAcquiredAt);
                  const isStale = days !== null && days >= STALE_DAYS_THRESHOLD;
                  return (
                    <tr key={item._id} className={isStale ? styles.rowStale : ""}>
                      <td>{item.name}</td>
                      <td>{item.locationName}</td>
                      <td>{item.quantityOnHand.toLocaleString()}</td>
                      <td>{item.availableQuantity.toLocaleString()}</td>
                      <td>{formatFreshness(item.stockUpdatedAt)}</td>
                      <td>
                        {days === null
                          ? "—"
                          : isStale
                            ? `⚠ ${days}d`
                            : `${days}d`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
    </div>
  );
}
