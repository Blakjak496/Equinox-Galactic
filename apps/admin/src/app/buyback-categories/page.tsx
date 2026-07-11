"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import { api, BuybackCategory, BuybackItem, BuybackLocation } from "@/lib/api";
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

type CategoryEdit = Partial<{
  accepted: boolean;
  percentOffered: string;
  variable: boolean;
  haulable: boolean;
  acceptedLocationIds: string[] | null;
}>;
type ItemEdit = Partial<{
  accepted: boolean | null;
  rateOverride: string;
  notes: string;
  variable: boolean | null;
  haulable: boolean | null;
  acceptedLocationIds: string[] | null;
}>;

export default function BuybackCategories() {
  const [categories, setCategories] = useState<BuybackCategory[]>([]);
  const [locations, setLocations] = useState<BuybackLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [saving, setSaving] = useState(false);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [itemsByCategory, setItemsByCategory] = useState<
    Record<string, BuybackItem[]>
  >({});
  const [loadingItemsFor, setLoadingItemsFor] = useState<Set<string>>(
    new Set(),
  );

  const [categoryEdits, setCategoryEdits] = useState<
    Record<string, CategoryEdit>
  >({});
  const [itemEdits, setItemEdits] = useState<Record<string, ItemEdit>>({});

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

    api
      .getBuybackLocations()
      .then(({ data }) => setLocations(data))
      .catch(() => {});
  }, []);

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    const q = categorySearch.trim().toLowerCase();
    return categories.filter((category) =>
      category.name.toLowerCase().includes(q),
    );
  }, [categories, categorySearch]);

  const dirtyCount =
    Object.keys(categoryEdits).length + Object.keys(itemEdits).length;

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

  const setCategoryEdit = (categoryId: string, edit: CategoryEdit) => {
    setCategoryEdits((prev) => ({
      ...prev,
      [categoryId]: { ...prev[categoryId], ...edit },
    }));
  };

  const setItemEdit = (itemId: string, edit: ItemEdit) => {
    setItemEdits((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], ...edit },
    }));
  };

  const runItemSearch = async () => {
    if (itemQuery.trim().length < 2) return;

    setItemSearchLoading(true);
    setError(null);
    try {
      const { data } = await api.searchBuybackItems({ q: itemQuery.trim() });
      setItemSearchResults(data);
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

  const handleSaveChanges = async () => {
    setSaving(true);
    setError(null);

    const categoryIds = Object.keys(categoryEdits);
    const itemIds = Object.keys(itemEdits);

    const categoryResults = await Promise.allSettled(
      categoryIds.map((id) => {
        const edit = categoryEdits[id];
        const payload: {
          accepted?: boolean;
          percentOffered?: number;
          variable?: boolean;
          haulable?: boolean;
          acceptedLocationIds?: string[] | null;
        } = {};
        if (edit.accepted !== undefined) payload.accepted = edit.accepted;
        if (edit.percentOffered !== undefined)
          payload.percentOffered = Number(edit.percentOffered);
        if (edit.variable !== undefined) payload.variable = edit.variable;
        if (edit.haulable !== undefined) payload.haulable = edit.haulable;
        if (edit.acceptedLocationIds !== undefined)
          payload.acceptedLocationIds = edit.acceptedLocationIds;
        return api.updateBuybackCategory(id, payload);
      }),
    );

    const itemResults = await Promise.allSettled(
      itemIds.map((id) => {
        const edit = itemEdits[id];
        const payload: {
          accepted?: boolean | null;
          rateOverride?: number | null;
          notes?: string | null;
          variable?: boolean | null;
          haulable?: boolean | null;
          acceptedLocationIds?: string[] | null;
        } = {};
        if (edit.accepted !== undefined) payload.accepted = edit.accepted;
        if (edit.rateOverride !== undefined)
          payload.rateOverride =
            edit.rateOverride.trim() === "" ? null : Number(edit.rateOverride);
        if (edit.notes !== undefined)
          payload.notes = edit.notes.trim() === "" ? null : edit.notes;
        if (edit.variable !== undefined) payload.variable = edit.variable;
        if (edit.haulable !== undefined) payload.haulable = edit.haulable;
        if (edit.acceptedLocationIds !== undefined)
          payload.acceptedLocationIds = edit.acceptedLocationIds;
        return api.updateBuybackItem(id, payload);
      }),
    );

    let failures = 0;
    const succeededCategoryIds = new Set<string>();
    categoryResults.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        succeededCategoryIds.add(categoryIds[idx]);
        const updated = result.value.data;
        setCategories((prev) =>
          prev.map((c) => (c._id === updated._id ? updated : c)),
        );
      } else {
        failures++;
      }
    });

    const succeededItemIds = new Set<string>();
    itemResults.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        succeededItemIds.add(itemIds[idx]);
        patchItemInPlace(result.value.data);
      } else {
        failures++;
      }
    });

    setCategoryEdits((prev) => {
      const next = { ...prev };
      succeededCategoryIds.forEach((id) => delete next[id]);
      return next;
    });
    setItemEdits((prev) => {
      const next = { ...prev };
      succeededItemIds.forEach((id) => delete next[id]);
      return next;
    });

    if (failures > 0) {
      setError(
        `Failed to save ${failures} change${failures === 1 ? "" : "s"}. Unsaved changes are still shown below.`,
      );
    }

    setSaving(false);
  };

  const renderLocationsSelect = (
    acceptedLocationIds: string[] | null,
    onChange: (ids: string[] | null) => void,
  ) => (
    <div className={styles.locationsCell}>
      <select
        multiple
        size={3}
        className={styles.locationsSelect}
        value={acceptedLocationIds ?? []}
        onChange={(e) => {
          const selected = Array.from(e.target.selectedOptions).map(
            (o) => o.value,
          );
          onChange(selected.length === 0 ? null : selected);
        }}
      >
        {locations.map((location) => (
          <option key={location._id} value={location._id}>
            {location.name}
            {location.isHub ? " (hub)" : ""}
          </option>
        ))}
      </select>
      <span className={styles.locationsHint}>
        {acceptedLocationIds ? `${acceptedLocationIds.length} selected` : "All"}
      </span>
    </div>
  );

  const renderItemRow = (item: BuybackItem, showCategory: boolean) => {
    const edit = itemEdits[item._id];
    const accepted =
      edit?.accepted !== undefined ? edit.accepted : item.accepted;
    const rateOverride =
      edit?.rateOverride ?? item.rateOverride?.toString() ?? "";
    const notes = edit?.notes ?? item.notes ?? "";
    const variable = edit?.variable !== undefined ? edit.variable : item.variable;
    const haulable = edit?.haulable !== undefined ? edit.haulable : item.haulable;
    const acceptedLocationIds =
      edit?.acceptedLocationIds !== undefined
        ? edit.acceptedLocationIds
        : item.acceptedLocationIds;
    const isDirty = Boolean(edit);

    return (
      <tr key={item._id} className={isDirty ? styles.rowDirty : ""}>
        <td>{item.name}</td>
        {showCategory && <td>{item.categoryId.name}</td>}
        <td>
          <select
            value={acceptedToValue(accepted)}
            onChange={(e) =>
              setItemEdit(item._id, {
                accepted:
                  e.target.value === "inherit"
                    ? null
                    : e.target.value === "true",
              })
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
            value={rateOverride}
            onChange={(e) =>
              setItemEdit(item._id, { rateOverride: e.target.value })
            }
          />
        </td>
        <td>
          <input
            type="text"
            className={styles.notesInput}
            value={notes}
            onChange={(e) => setItemEdit(item._id, { notes: e.target.value })}
          />
        </td>
        <td>
          <select
            value={acceptedToValue(variable)}
            onChange={(e) =>
              setItemEdit(item._id, {
                variable:
                  e.target.value === "inherit"
                    ? null
                    : e.target.value === "true",
              })
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
          <select
            value={acceptedToValue(haulable)}
            onChange={(e) =>
              setItemEdit(item._id, {
                haulable:
                  e.target.value === "inherit"
                    ? null
                    : e.target.value === "true",
              })
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
          {renderLocationsSelect(acceptedLocationIds, (ids) =>
            setItemEdit(item._id, { acceptedLocationIds: ids }),
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className={styles.container}>
      <Panel>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Buyback Items by Category</h2>
          <p className={styles.hint}>
            Every EVE item group is seeded here, unaccepted by default. Turn
            on the ones you buy back, set their rate, then expand a category
            to browse its items and tick/rate individual ones that need to
            differ from the category default. Variable gates the liquidity
            modifier and margin safety net; Haulable controls whether an
            item's volume counts toward the hauling fee; Locations restricts
            which pickup locations this category/item can be quoted from
            (empty = all). Nothing is saved until you click Save Changes.
          </p>

          <div className={styles.saveBar}>
            <Button
              callback={handleSaveChanges}
              color="green"
              disabled={saving || dirtyCount === 0}
            >
              {saving
                ? "Saving…"
                : dirtyCount > 0
                  ? `Save Changes (${dirtyCount})`
                  : "Save Changes"}
            </Button>
          </div>

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
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Accepted</th>
                      <th>Rate Override</th>
                      <th>Notes</th>
                      <th>Variable</th>
                      <th>Haulable</th>
                      <th>Locations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemSearchResults.map((item) => renderItemRow(item, true))}
                  </tbody>
                </table>
              </div>
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
                <div className={styles.tableScroll}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th></th>
                        <th>Name</th>
                        <th>Accepted</th>
                        <th>% Offered</th>
                        <th>Variable</th>
                        <th>Haulable</th>
                        <th>Locations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCategories.map((category) => {
                        const edit = categoryEdits[category._id];
                        const accepted =
                          edit?.accepted !== undefined
                            ? edit.accepted
                            : category.accepted;
                        const percentOffered =
                          edit?.percentOffered ??
                          category.percentOffered.toString();
                        const variable =
                          edit?.variable !== undefined
                            ? edit.variable
                            : category.variable;
                        const haulable =
                          edit?.haulable !== undefined
                            ? edit.haulable
                            : category.haulable;
                        const acceptedLocationIds =
                          edit?.acceptedLocationIds !== undefined
                            ? edit.acceptedLocationIds
                            : category.acceptedLocationIds;
                        const isDirty = Boolean(edit);

                        return (
                          <Fragment key={category._id}>
                            <tr className={isDirty ? styles.rowDirty : ""}>
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
                                  checked={accepted}
                                  onChange={(e) =>
                                    setCategoryEdit(category._id, {
                                      accepted: e.target.checked,
                                    })
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className={styles.rateInput}
                                  value={percentOffered}
                                  onChange={(e) =>
                                    setCategoryEdit(category._id, {
                                      percentOffered: e.target.value,
                                    })
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={variable}
                                  onChange={(e) =>
                                    setCategoryEdit(category._id, {
                                      variable: e.target.checked,
                                    })
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={haulable}
                                  onChange={(e) =>
                                    setCategoryEdit(category._id, {
                                      haulable: e.target.checked,
                                    })
                                  }
                                />
                              </td>
                              <td>
                                {renderLocationsSelect(
                                  acceptedLocationIds,
                                  (ids) =>
                                    setCategoryEdit(category._id, {
                                      acceptedLocationIds: ids,
                                    }),
                                )}
                              </td>
                            </tr>
                            {expandedIds.has(category._id) && (
                              <tr key={`${category._id}-items`}>
                                <td colSpan={7} className={styles.detailCell}>
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
                                    <div className={styles.tableScroll}>
                                      <table className={styles.itemsTable}>
                                        <thead>
                                          <tr>
                                            <th>Name</th>
                                            <th>Accepted</th>
                                            <th>Rate Override</th>
                                            <th>Notes</th>
                                            <th>Variable</th>
                                            <th>Haulable</th>
                                            <th>Locations</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(
                                            itemsByCategory[category._id] ?? []
                                          ).map((item) =>
                                            renderItemRow(item, false),
                                          )}
                                        </tbody>
                                      </table>
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
                </div>
              )}
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}
