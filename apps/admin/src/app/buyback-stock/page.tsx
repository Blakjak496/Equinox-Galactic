"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import { api, BuybackItem, BuybackLocation, BuybackStockItem } from "@/lib/api";
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [hubLocations, setHubLocations] = useState<BuybackLocation[]>([]);
  const [itemQuery, setItemQuery] = useState("");
  const [itemResults, setItemResults] = useState<BuybackItem[]>([]);
  const [searchingItems, setSearchingItems] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BuybackItem | null>(null);
  const [addLocationId, setAddLocationId] = useState("");
  const [addQuantity, setAddQuantity] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  const fetchStock = () => {
    api
      .getBuybackStock()
      .then(({ data }) => setItems(data))
      .catch(() => setError("Failed to load buyback stock"))
      .finally(() => setLoading(false));
  };

  useEffect(fetchStock, []);

  useEffect(() => {
    api
      .getBuybackLocations()
      .then(({ data }) =>
        setHubLocations(
          data.filter((loc) => loc.isHub && loc.stockLocationId != null),
        ),
      )
      .catch(() => setHubLocations([]));
  }, []);

  useEffect(() => {
    if (itemQuery.trim().length < 2) {
      setItemResults([]);
      return;
    }

    setSearchingItems(true);
    const timeout = setTimeout(() => {
      api
        .searchBuybackItems({ q: itemQuery.trim() })
        .then(({ data }) => setItemResults(data))
        .catch(() => setItemResults([]))
        .finally(() => setSearchingItems(false));
    }, 300);

    return () => clearTimeout(timeout);
  }, [itemQuery]);

  const handleSelectItem = (item: BuybackItem) => {
    setSelectedItem(item);
    setItemQuery("");
    setItemResults([]);
  };

  const handleClearSelectedItem = () => {
    setSelectedItem(null);
  };

  const handleAddStock = async () => {
    const quantity = Number(addQuantity);
    if (!selectedItem) {
      setAddError("Search for and select an item first");
      return;
    }
    if (!addLocationId) {
      setAddError("Select a location");
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setAddError("Quantity must be a positive number");
      return;
    }

    setAdding(true);
    setAddError(null);
    setAddSuccess(null);
    try {
      const res = await api.addBuybackStock(
        selectedItem.typeId,
        addLocationId,
        quantity,
      );
      if (!res.ok) {
        setAddError(res.message ?? "Failed to add stock");
        return;
      }
      setAddSuccess(
        `Added ${quantity.toLocaleString()}x ${selectedItem.name}.`,
      );
      setSelectedItem(null);
      setAddQuantity("");
      fetchStock();
    } catch {
      setAddError("Failed to add stock");
    } finally {
      setAdding(false);
    }
  };

  const handleStartEdit = (item: BuybackStockItem) => {
    setEditingId(item._id);
    setEditValue(String(item.quantityOnHand));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleSaveEdit = async (item: BuybackStockItem) => {
    const quantity = Number(editValue);
    if (!Number.isFinite(quantity) || quantity < 0) {
      setError("Quantity must be a non-negative number");
      return;
    }

    setSavingEdit(true);
    setError(null);
    try {
      await api.updateBuybackStock(item.itemId, item.locationId, quantity);
      setEditingId(null);
      fetchStock();
    } catch {
      setError("Failed to update stock quantity");
    } finally {
      setSavingEdit(false);
    }
  };

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

          <div className={styles.addStockSection}>
            <h3 className={styles.addStockTitle}>Add Stock</h3>
            <p className={styles.hint}>
              For items you&apos;ve physically acquired since the last sync -
              the next asset sync always overwrites this with the real ESI
              count, so this is just a stopgap to make new stock purchasable
              right away instead of waiting up to a day.
            </p>

            <div className={styles.addStockRow}>
              <div className={styles.addStockItem}>
                {selectedItem ? (
                  <div className={styles.selectedItem}>
                    <span>{selectedItem.name}</span>
                    <Button
                      callback={handleClearSelectedItem}
                      color="red"
                    >
                      Clear
                    </Button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={itemQuery}
                      onChange={(e) => setItemQuery(e.target.value)}
                      placeholder="Search items by name…"
                    />
                    {searchingItems && (
                      <span className={styles.muted}>Searching…</span>
                    )}
                    {itemResults.length > 0 && (
                      <div className={styles.itemResults}>
                        {itemResults.map((result) => (
                          <button
                            key={result._id}
                            type="button"
                            className={styles.itemResult}
                            onClick={() => handleSelectItem(result)}
                          >
                            {result.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <select
                className={styles.addStockLocationSelect}
                value={addLocationId}
                onChange={(e) => setAddLocationId(e.target.value)}
              >
                <option value="">Select location…</option>
                {hubLocations.map((loc) => (
                  <option key={loc._id} value={loc._id}>
                    {loc.name}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min={1}
                step={1}
                className={styles.addStockQtyInput}
                value={addQuantity}
                onChange={(e) => setAddQuantity(e.target.value)}
                placeholder="Qty"
              />

              <Button callback={handleAddStock} color="green" disabled={adding}>
                {adding ? "Adding…" : "Add Stock"}
              </Button>
            </div>

            {addError && <p className={styles.error}>{addError}</p>}
            {addSuccess && <p className={styles.success}>{addSuccess}</p>}
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
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const days = sittingDays(item.oldestUnsoldAcquiredAt);
                  const isStale = days !== null && days >= STALE_DAYS_THRESHOLD;
                  const isEditing = editingId === item._id;
                  return (
                    <tr key={item._id} className={isStale ? styles.rowStale : ""}>
                      <td>{item.name}</td>
                      <td>{item.locationName}</td>
                      <td>
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            step={1}
                            className={styles.editInput}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            autoFocus
                          />
                        ) : (
                          item.quantityOnHand.toLocaleString()
                        )}
                      </td>
                      <td>{item.availableQuantity.toLocaleString()}</td>
                      <td>{formatFreshness(item.stockUpdatedAt)}</td>
                      <td>
                        {days === null
                          ? "—"
                          : isStale
                            ? `⚠ ${days}d`
                            : `${days}d`}
                      </td>
                      <td className={styles.actions}>
                        {isEditing ? (
                          <>
                            <Button
                              callback={() => handleSaveEdit(item)}
                              color="green"
                              disabled={savingEdit}
                            >
                              {savingEdit ? "Saving…" : "Save"}
                            </Button>
                            <Button
                              callback={handleCancelEdit}
                              color="orange"
                              disabled={savingEdit}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            callback={() => handleStartEdit(item)}
                            color="orange"
                          >
                            Edit
                          </Button>
                        )}
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
