"use client";

import { Fragment, useEffect, useState } from "react";
import Panel from "@/components/Panel/Panel";
import { api, BuybackQuote } from "@/lib/api";
import styles from "./BuybackQuotes.module.css";

const STATUS_FILTERS = [
  { value: "discrepancy", label: "Discrepancy" },
  { value: "pending_contract", label: "No Contract" },
  { value: "matched", label: "Matched" },
  { value: "expired", label: "Expired" },
  { value: "", label: "All" },
];

const STATUS_LABELS: Record<string, string> = {
  pending_contract: "no contract",
  matched: "matched",
  expired: "expired",
};

function formatIsk(n: number): string {
  return `${Math.round(n).toLocaleString()} ISK`;
}

export default function BuybackQuotes() {
  const [quotes, setQuotes] = useState<BuybackQuote[]>([]);
  const [status, setStatus] = useState("matched");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .getBuybackQuotes(status || undefined)
      .then(({ data }) => setQuotes(data))
      .catch(() => setError("Failed to load buyback quotes"))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div className={styles.container}>
      <Panel>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Buyback Quotes</h2>

          <div className={styles.filterRow}>
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                className={`${styles.filterButton} ${status === filter.value ? styles.filterButtonActive : ""}`}
                onClick={() => setStatus(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {error && <p className={styles.error}>{error}</p>}

          {loading ? (
            <p className={styles.muted}>Loading…</p>
          ) : quotes.length === 0 ? (
            <p className={styles.muted}>No quotes found.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Status</th>
                  <th>Net Total</th>
                  <th>Items</th>
                  <th>Created</th>
                  <th>Expires</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => (
                  <Fragment key={quote._id}>
                    <tr
                      className={quote.discrepancy ? styles.discrepancyRow : ""}
                      onClick={() =>
                        setExpandedId(
                          expandedId === quote._id ? null : quote._id,
                        )
                      }
                    >
                      <td data-label="Reference">{quote.referenceId}</td>
                      <td data-label="Status">
                        <span
                          className={`${styles.statusPill} ${styles[`status-${quote.status}`]}`}
                        >
                          {STATUS_LABELS[quote.status] ?? quote.status}
                        </span>
                        {quote.discrepancy && (
                          <span
                            className={styles.discrepancyBadge}
                            title="Contract contents or value don't match this quote"
                          >
                            ⚠ needs attention
                          </span>
                        )}
                      </td>
                      <td data-label="Net Total">
                        {formatIsk(quote.netTotalPrice)}
                      </td>
                      <td data-label="Items">{quote.items.length}</td>
                      <td data-label="Created">
                        {new Date(quote.createdAt).toLocaleString()}
                      </td>
                      <td data-label="Expires">
                        {new Date(quote.expiresAt).toLocaleDateString()}
                      </td>
                    </tr>
                    {expandedId === quote._id && (
                      <tr>
                        <td colSpan={6} className={styles.detailCell}>
                          <table className={styles.itemsTable}>
                            <thead>
                              <tr>
                                <th>Item</th>
                                <th>Category</th>
                                <th>Qty</th>
                                <th>JBV</th>
                                <th>%</th>
                                <th>Offer</th>
                                <th>Accepted</th>
                              </tr>
                            </thead>
                            <tbody>
                              {quote.items.map((item, idx) => (
                                <tr key={idx}>
                                  <td data-label="Item">{item.name}</td>
                                  <td data-label="Category">
                                    {item.categoryName}
                                  </td>
                                  <td data-label="Qty">
                                    {item.quantity.toLocaleString()}
                                  </td>
                                  <td data-label="JBV">
                                    {formatIsk(item.totalJbv)}
                                  </td>
                                  <td data-label="%">{item.percentOffered}%</td>
                                  <td data-label="Offer">
                                    {formatIsk(item.offerValue)}
                                  </td>
                                  <td data-label="Accepted">
                                    {item.accepted
                                      ? "Yes"
                                      : (item.rejectReason ?? "No")}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
    </div>
  );
}
