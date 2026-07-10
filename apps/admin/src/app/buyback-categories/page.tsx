"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import { api, BuybackCategory, BuybackItem } from "@/lib/api";
import styles from "./BuybackCategories.module.css";

const ACCEPTED_OPTIONS = [
  { value: "inherit", label: "Inherit from category" },
  { value: "true", label: "Accepted" },
  { value: "false", label: "Not accepted" },
];

function acceptedToValue(accepted: boolean | null): string {
  if (accepted === null) return "inherit";
  return String(accepted);
}

type ItemDraft = { rateOverride: string; notes: string };

export default function BuybackCategories() {
  const [categories, setCategories] = useState<BuybackCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [itemsByCategory, setItemsByCategory] = useState<
    Record<string, BuybackItem[]>
  >({});
  const [loadingItemsFor, setLoadingItemsFor] = useState<Set<string>>(
    new Set(),
  );
  const [drafts, setDrafts] = useState<Record<string, ItemDraft>>({});

  const [itemQuery, setItemQuery] = useState("");
  const [itemSearchResults, setItemSearchResults] = useState<
    BuybackItem[] | null
  >(null);
  const [itemSearchLoading, setItemSearchLoading] = useState(false);

  useEffect(() => {
    api
      .getBuybackCategories()
      .then(({ data }) => setCategories(data))
      .catch(() => setError("Failed to load buyback categories"))
      .finally(() => setLoading(false));
  }, []);

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    const q = categorySearch.trim().toLowerCase();
    return categories.filter((category) =>
      category.name.toLowerCase().includes(q),
    );
  }, [categories, categorySearch]);

  const seedDraftsFor = (items: BuybackItem[]) => {
    setDrafts((prev) => ({
      ...prev,
      ...Object.fromEntries(
        items.map((item) => [
          item._id,
          {
            rateOverride: item.rateOverride?.toString() ?? "",
            notes: item.notes ?? "",
          },
        ]),
      ),
    }));
  };

  const toggleExpanded = async (category: BuybackCategory) => {
    const next = new Set(expandedIds);

    if (next.has(category._id)) {
      next.delete(category._id);
      setExpandedIds(next);
      return;
    }

    next.add(category._id);
    setExpandedIds(next);

    if (itemsByCategory[category._id]) return;

    setLoadingItemsFor((prev) => new Set(prev).add(category._id));
    try {
      const { data } = await api.searchBuybackItems({
        categoryId: category._id,
      });
      setItemsByCategory((prev) => ({ ...prev, [category._id]: data }));
      seedDraftsFor(data);
    } catch {
      setError(`Failed to load items for "${category.name}"`);
    } finally {
      setLoadingItemsFor((prev) => {
        const next = new Set(prev);
        next.delete(category._id);
        return next;
      });
    }
  };

  const patchItemInPlace = (item: BuybackItem) => {
    setItemsByCategory((prev) => {
      const categoryId = item.categoryId._id;
      const list = prev[categoryId];
      if (!list) return prev;
      return {
        ...prev,
        [categoryId]: list.map((i) => (i._id === item._id ? item : i)),
      };
    });
    setItemSearchResults((prev) =>
      prev ? prev.map((i) => (i._id === item._id ? item : i)) : prev,
    );
  };

  const handleToggleAccepted = async (category: BuybackCategory) => {
    setSavingId(category._id);
    try {
      const { data } = await api.updateBuybackCategory(category._id, {
        accepted: !category.accepted,
      });
      setCategories((prev) =>
        prev.map((c) => (c._id === data._id ? data : c)),
      );
    } catch {
      setError(`Failed to update "${category.name}"`);
    } finally {
      setSavingId(null);
    }
  };

  const handleRateBlur = async (category: BuybackCategory, value: string) => {
    const percentOffered = Number(value);
    if (
      !Number.isFinite(percentOffered) ||
      percentOffered === category.percentOffered
    )
      return;

    setSavingId(category._id);
    try {
      const { data } = await api.updateBuybackCategory(category._id, {
        percentOffered,
      });
      setCategories((prev) =>
        prev.map((c) => (c._id === data._id ? data : c)),
      );
    } catch {
      setError(`Failed to update "${category.name}"`);
    } finally {
      setSavingId(null);
    }
  };

  const handleItemAcceptedChange = async (
    item: BuybackItem,
    value: string,
  ) => {
    const accepted = value === "inherit" ? null : value === "true";

    setSavingId(item._id);
    try {
      const { data } = await api.updateBuybackItem(item._id, { accepted });
      patchItemInPlace(data);
    } catch {
      setError(`Failed to update "${item.name}"`);
    } finally {
      setSavingId(null);
    }
  };

  const handleItemSaveDraft = async (item: BuybackItem) => {
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
      patchItemInPlace(data);
    } catch {
      setError(`Failed to update "${item.name}"`);
    } finally {
      setSavingId(null);
    }
  };

  const runItemSearch = async () => {
    if (itemQuery.trim().length < 2) return;

    setItemSearchLoading(true);
    setError(null);
    try {
      const { data } = await api.searchBuybackItems({ q: itemQuery.trim() });
      setItemSearchResults(data);
      seedDraftsFor(data);
    } catch {
      setError("Failed to search buyback items");
    } finally {
      setItemSearchLoading(false);
    }
  };

  const clearItemSearch = () => {
    setItemQuery("");
    setItemSearchResults(null);
  };

  const renderItemRow = (item: BuybackItem, showCategory: boolean) => (
    <tr
      key={item._id}
      className={savingId === item._id ? styles.rowSaving : ""}
    >
      <td>{item.name}</td>
      {showCategory && <td>{item.categoryId.name}</td>}
      <td>
        <select
          value={acceptedToValue(item.accepted)}
          onChange={(e) => handleItemAcceptedChange(item, e.target.value)}
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
              [item._id]: { ...prev[item._id], notes: e.target.value },
            }))
          }
        />
      </td>
      <td>
        <Button
          callback={() => handleItemSaveDraft(item)}
          color="green"
          disabled={savingId === item._id}
        >
          Save
        </Button>
      </td>
    </tr>
  );

  return (
    <div className={styles.container}>
      <Panel>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Buyback Items by Category</h2>
          <p className={styles.hint}>
            Every EVE item group is seeded here, unaccepted by default. Turn
            on the ones you buy back, set their rate, then expand a category
            to browse its items and tick/rate individual ones that need to
            differ from the category default.
          </p>

          <div className={styles.searchRow}>
            <input
              type="text"
              className={styles.search}
              placeholder="Search items by name (min 2 characters)…"
              value={itemQuery}
              onChange={(e) => setItemQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runItemSearch()}
            />
            <Button
              callback={runItemSearch}
              color="blue"
              disabled={itemSearchLoading}
            >
              {itemSearchLoading ? "Searching…" : "Search Items"}
            </Button>
            {itemSearchResults && (
              <Button callback={clearItemSearch} color="orange">
                Back to Categories
              </Button>
            )}
          </div>

          {error && <p className={styles.error}>{error}</p>}

          {itemSearchResults ? (
            itemSearchResults.length === 0 ? (
              <p className={styles.muted}>No items matched.</p>
            ) : (
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
                  {itemSearchResults.map((item) => renderItemRow(item, true))}
                </tbody>
              </table>
            )
          ) : (
            <>
              <input
                type="text"
                className={styles.search}
                placeholder="Filter categories…"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
              />

              {loading ? (
                <p className={styles.muted}>Loading…</p>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th></th>
                      <th>Name</th>
                      <th>Accepted</th>
                      <th>% Offered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategories.map((category) => (
                      <Fragment key={category._id}>
                        <tr
                          className={
                            savingId === category._id ? styles.rowSaving : ""
                          }
                        >
                          <td>
                            <button
                              className={styles.expandButton}
                              onClick={() => toggleExpanded(category)}
                            >
                              {expandedIds.has(category._id) ? "▾" : "▸"}
                            </button>
                          </td>
                          <td>{category.name}</td>
                          <td>
                            <input
                              type="checkbox"
                              checked={category.accepted}
                              onChange={() => handleToggleAccepted(category)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className={styles.rateInput}
                              defaultValue={category.percentOffered}
                              key={`${category._id}-${category.percentOffered}`}
                              onBlur={(e) =>
                                handleRateBlur(category, e.target.value)
                              }
                              disabled={!category.accepted}
                            />
                          </td>
                        </tr>
                        {expandedIds.has(category._id) && (
                          <tr key={`${category._id}-items`}>
                            <td colSpan={4} className={styles.detailCell}>
                              {loadingItemsFor.has(category._id) ? (
                                <p className={styles.muted}>
                                  Loading items…
                                </p>
                              ) : itemsByCategory[category._id]?.length ===
                                0 ? (
                                <p className={styles.muted}>
                                  No items found in this category.
                                </p>
                              ) : (
                                <table className={styles.itemsTable}>
                                  <thead>
                                    <tr>
                                      <th>Name</th>
                                      <th>Accepted</th>
                                      <th>Rate Override</th>
                                      <th>Notes</th>
                                      <th></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(itemsByCategory[category._id] ?? []).map(
                                      (item) => renderItemRow(item, false),
                                    )}
                                  </tbody>
                                </table>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}
