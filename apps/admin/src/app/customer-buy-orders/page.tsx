"use client";

import { Fragment, useEffect, useState } from "react";
import Panel from "@/components/Panel/Panel";
import { api, BuyOrder } from "@/lib/api";
import styles from "./CustomerBuyOrders.module.css";

const STATUS_FILTERS = [
  { value: "pending_contract", label: "No Contract" },
  { value: "contract_created", label: "Contract Created" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "", label: "All" },
];

const STATUS_LABELS: Record<string, string> = {
  pending_contract: "no contract",
  contract_created: "contract created",
  completed: "completed",
  cancelled: "cancelled",
};

function formatIsk(n: number): string {
  return `${Math.round(n).toLocaleString()} ISK`;
}

export default function CustomerBuyOrders() {
  const [orders, setOrders] = useState<BuyOrder[]>([]);
  const [status, setStatus] = useState("pending_contract");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .getBuyOrders(status || undefined)
      .then(({ data }) => setOrders(data))
      .catch(() => setError("Failed to load buy orders"))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div className={styles.container}>
      <Panel>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Customer Buy Orders</h2>

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
          ) : orders.length === 0 ? (
            <p className={styles.muted}>No buy orders found.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Character</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Total Price</th>
                  <th>Items</th>
                  <th>Created</th>
                  <th>Expires</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <Fragment key={order._id}>
                    <tr
                      onClick={() =>
                        setExpandedId(
                          expandedId === order._id ? null : order._id,
                        )
                      }
                    >
                      <td>{order.referenceId}</td>
                      <td>{order.customerCharacterName}</td>
                      <td>{order.locationName}</td>
                      <td>
                        <span
                          className={`${styles.statusPill} ${styles[`status-${order.status}`]}`}
                        >
                          {STATUS_LABELS[order.status] ?? order.status}
                        </span>
                      </td>
                      <td>{formatIsk(order.totalPrice)}</td>
                      <td>{order.items.length}</td>
                      <td>{new Date(order.createdAt).toLocaleString()}</td>
                      <td>{new Date(order.expiresAt).toLocaleDateString()}</td>
                    </tr>
                    {expandedId === order._id && (
                      <tr>
                        <td colSpan={8} className={styles.detailCell}>
                          <table className={styles.itemsTable}>
                            <thead>
                              <tr>
                                <th>Item</th>
                                <th>Qty</th>
                                <th>Unit Price</th>
                                <th>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {order.items.map((item, idx) => (
                                <tr key={idx}>
                                  <td>{item.name}</td>
                                  <td>{item.quantity.toLocaleString()}</td>
                                  <td>{formatIsk(item.unitPrice)}</td>
                                  <td>{formatIsk(item.totalPrice)}</td>
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
