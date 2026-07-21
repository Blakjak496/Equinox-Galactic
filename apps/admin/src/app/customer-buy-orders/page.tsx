"use client";

import { Fragment, useEffect, useState } from "react";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
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

const STALE_DAYS_THRESHOLD = 7;

function formatIsk(n: number): string {
  return `${Math.round(n).toLocaleString()} ISK`;
}

function pendingDays(order: BuyOrder): number | null {
  if (order.status !== "pending_contract") return null;
  return Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 86_400_000);
}

export default function CustomerBuyOrders() {
  const [orders, setOrders] = useState<BuyOrder[]>([]);
  const [status, setStatus] = useState("pending_contract");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchOrders = () => {
    setLoading(true);
    api
      .getBuyOrders(status || undefined)
      .then(({ data }) => setOrders(data))
      .catch(() => setError("Failed to load buy orders"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleCancel = async (order: BuyOrder) => {
    if (
      !confirm(
        `Cancel order ${order.referenceId} for ${order.customerCharacterName}?`,
      )
    )
      return;

    setCancellingId(order._id);
    try {
      await api.updateBuyOrder(order._id, { status: "cancelled" });
      fetchOrders();
    } catch {
      setError("Failed to cancel buy order");
    } finally {
      setCancellingId(null);
    }
  };

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
                  <th>Pending</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const days = pendingDays(order);
                  const isStale = days !== null && days >= STALE_DAYS_THRESHOLD;
                  return (
                  <Fragment key={order._id}>
                    <tr
                      className={isStale ? styles.rowStale : ""}
                      onClick={() =>
                        setExpandedId(
                          expandedId === order._id ? null : order._id,
                        )
                      }
                    >
                      <td data-label="Reference">{order.referenceId}</td>
                      <td data-label="Character">
                        {order.customerCharacterName}
                      </td>
                      <td data-label="Location">{order.locationName}</td>
                      <td data-label="Status">
                        <span
                          className={`${styles.statusPill} ${styles[`status-${order.status}`]}`}
                        >
                          {STATUS_LABELS[order.status] ?? order.status}
                        </span>
                      </td>
                      <td data-label="Total Price">
                        {formatIsk(order.totalPrice)}
                      </td>
                      <td data-label="Items">{order.items.length}</td>
                      <td data-label="Created">
                        {new Date(order.createdAt).toLocaleString()}
                      </td>
                      <td data-label="Pending">
                        {days === null ? "—" : isStale ? `⚠ ${days}d` : `${days}d`}
                      </td>
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
                                  <td data-label="Item">{item.name}</td>
                                  <td data-label="Qty">
                                    {item.quantity.toLocaleString()}
                                  </td>
                                  <td data-label="Unit Price">
                                    {formatIsk(item.unitPrice)}
                                  </td>
                                  <td data-label="Total">
                                    {formatIsk(item.totalPrice)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {order.status !== "completed" &&
                            order.status !== "cancelled" && (
                              <div className={styles.detailActions}>
                                <Button
                                  callback={() => handleCancel(order)}
                                  color="red"
                                  disabled={cancellingId === order._id}
                                >
                                  {cancellingId === order._id
                                    ? "Cancelling…"
                                    : "Cancel Order"}
                                </Button>
                              </div>
                            )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
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
