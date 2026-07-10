"use client";

import { useState } from "react";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import { api, BuybackItem } from "@/lib/api";
import styles from "./BuybackItems.module.css";

const ACCEPTED_OPTIONS = [
  { value: "inherit", label: "Inherit from category" },
  { value: "true", label: "Accepted" },
  { value: "false", label: "Not accepted" },
];

function acceptedToValue(accepted: boolean | null): string {
  if (accepted === null) return "inherit";
  return String(accepted);
}

export default function BuybackItems() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<BuybackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { rateOverride: string; notes: string }>
  >({});

  const runSearch = async () => {
    if (query.trim().length < 2) return;

    setLoading(true);
    setError(null);
    try {
      const { data } = await api.searchBuybackItems({ q: query.trim() });
      setItems(data);
      setDrafts(
        Object.fromEntries(
          data.map((item) => [
            item._id,
            {
              rateOverride: item.rateOverride?.toString() ?? "",
              notes: item.notes ?? "",
            },
          ]),
        ),
      );
    } catch {
      setError("Failed to search buyback items");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptedChange = async (item: BuybackItem, value: string) => {
    const accepted = value === "inherit" ? null : value === "true";

    setSavingId(item._id);
    try {
      const { data } = await api.updateBuybackItem(item._id, { accepted });
      setItems((prev) => prev.map((i) => (i._id === data._id ? data : i)));
    } catch {
      setError(`Failed to update "${item.name}"`);
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveDraft = async (item: BuybackItem) => {
    const draft = drafts[item._id];
    if (!draft) return;

    const rateOverride =
      draft.rateOverride.trim() === "" ? null : Number(draft.rateOverride);
    const notes = draft.notes.trim() === "" ? null : draft.notes.trim();

    setSavingId(item._id);
    try {
      const { data } = await api.updateBuybackItem(item._id, {
        rateOverride,
        notes,
      });
      setItems((prev) => prev.map((i) => (i._id === data._id ? data : i)));
    } catch {
      setError(`Failed to update "${item.name}"`);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className={styles.container}>
      <Panel>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Buyback Items</h2>
          <p className={styles.hint}>
            Override an individual item's accepted state or rate when it
            needs to differ from its category — e.g. accepting a category but
            excluding a few items in it.
          </p>

          <div className={styles.searchRow}>
            <input
              type="text"
              className={styles.search}
              placeholder="Search items by name (min 2 characters)…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
            />
            <Button callback={runSearch} color="blue" disabled={loading}>
              {loading ? "Searching…" : "Search"}
            </Button>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          {items.length > 0 && (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Accepted</th>
                  <th>Rate Override</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item._id}
                    className={savingId === item._id ? styles.rowSaving : ""}
                  >
                    <td>{item.name}</td>
                    <td>
                      {item.categoryId.name}
                      <span className={styles.categoryHint}>
                        {item.categoryId.accepted
                          ? ` (${item.categoryId.percentOffered}%)`
                          : " (not accepted)"}
                      </span>
                    </td>
                    <td>
                      <select
                        value={acceptedToValue(item.accepted)}
                        onChange={(e) =>
                          handleAcceptedChange(item, e.target.value)
                        }
                      >
                        {ACCEPTED_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        className={styles.rateInput}
                        placeholder="inherit"
                        value={drafts[item._id]?.rateOverride ?? ""}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [item._id]: {
                              ...prev[item._id],
                              rateOverride: e.target.value,
                            },
                          }))
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className={styles.notesInput}
                        value={drafts[item._id]?.notes ?? ""}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [item._id]: {
                              ...prev[item._id],
                              notes: e.target.value,
                            },
                          }))
                        }
                      />
                    </td>
                    <td>
                      <Button
                        callback={() => handleSaveDraft(item)}
                        color="green"
                        disabled={savingId === item._id}
                      >
                        Save
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loading && items.length === 0 && (
            <p className={styles.muted}>
              Search for an item to edit its accepted state, rate override,
              or notes.
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}
