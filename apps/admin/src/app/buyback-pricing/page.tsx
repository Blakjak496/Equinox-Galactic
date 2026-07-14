"use client";

import { Fragment, memo, useCallback, useEffect, useMemo, useState } from "react";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import {
  api,
  BuybackCategory,
  BuybackItem,
  BuybackLocation,
} from "@/lib/api";
import styles from "./BuybackPricing.module.css";

const ACCEPTED_OPTIONS = [
  { value: "inherit", label: "Inherit from category" },
  { value: "true", label: "Accepted" },
  { value: "false", label: "Not accepted" },
];

function acceptedToValue(accepted: boolean | null): string {
  if (accepted === null) return "inherit";
  return String(accepted);
}

function resolveAccepted(item: BuybackItem): boolean {
  return (item.accepted ?? item.categoryId.accepted) === true;
}

function formatRecommendedMeta(item: BuybackItem): string | null {
  if (item.recommendedRateUpdatedAt === null) return null;
  const ageMs = Date.now() - new Date(item.recommendedRateUpdatedAt).getTime();
  const ageHours = Math.round(ageMs / (60 * 60 * 1000));
  const age =
    ageHours < 1
      ? "just now"
      : ageHours < 24
        ? `${ageHours}h ago`
        : `${Math.round(ageHours / 24)}d ago`;
  return `updated ${age}`;
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

const LocationsCheckboxList = memo(function LocationsCheckboxList(props: {
  locations: BuybackLocation[];
  acceptedLocationIds: string[] | null;
  onChange: (ids: string[] | null) => void;
}) {
  const { locations, acceptedLocationIds, onChange } = props;
  const selected = acceptedLocationIds ?? [];

  const toggleLocation = (locationId: string) => {
    const next = selected.includes(locationId)
      ? selected.filter((id) => id !== locationId)
      : [...selected, locationId];
    onChange(next.length === 0 ? null : next);
  };

  return (
    <div className={styles.locationsCell}>
      <div className={styles.locationsCheckboxList}>
        {locations.map((location) => (
          <label key={location._id} className={styles.locationsCheckboxLabel}>
            <input
              type="checkbox"
              checked={selected.includes(location._id)}
              onChange={() => toggleLocation(location._id)}
            />
            {location.name}
            {location.isHub ? " (hub)" : ""}
          </label>
        ))}
      </div>
      <span className={styles.locationsHint}>
        {acceptedLocationIds ? `${acceptedLocationIds.length} selected` : "All"}
      </span>
    </div>
  );
});

const ItemRow = memo(function ItemRow(props: {
  item: BuybackItem;
  edit: ItemEdit | undefined;
  showCategory: boolean;
  locations: BuybackLocation[];
  actionPending: boolean;
  onEdit: (itemId: string, edit: ItemEdit) => void;
  onAccept: (item: BuybackItem) => void;
  onIgnore: (item: BuybackItem) => void;
}) {
  const {
    item,
    edit,
    showCategory,
    locations,
    actionPending,
    onEdit,
    onAccept,
    onIgnore,
  } = props;
  const accepted = edit?.accepted !== undefined ? edit.accepted : item.accepted;
  const rateOverride =
    edit?.rateOverride ?? item.rateOverride?.toString() ?? "";
  const notes = edit?.notes ?? item.notes ?? "";
  const variable =
    edit?.variable !== undefined ? edit.variable : item.variable;
  const haulable =
    edit?.haulable !== undefined ? edit.haulable : item.haulable;
  const acceptedLocationIds =
    edit?.acceptedLocationIds !== undefined
      ? edit.acceptedLocationIds
      : item.acceptedLocationIds;
  const isDirty = Boolean(edit);
  const rowClass = item.recommendationPending
    ? styles.rowPending
    : isDirty
      ? styles.rowDirty
      : "";
  const recommendedMeta = formatRecommendedMeta(item);

  return (
    <tr className={rowClass}>
      <td>{item.name}</td>
      {showCategory && <td>{item.categoryId.name}</td>}
      <td>
        <select
          value={acceptedToValue(accepted)}
          onChange={(e) =>
            onEdit(item._id, {
              accepted:
                e.target.value === "inherit" ? null : e.target.value === "true",
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
          onChange={(e) => onEdit(item._id, { rateOverride: e.target.value })}
        />
      </td>
      <td className={styles.recommendedCell}>
        {item.recommendedRate === null ? (
          <span className={styles.muted}>Not yet computed</span>
        ) : (
          <span className={styles.recommendedRate}>
            {item.recommendedRate.toFixed(1)}%
          </span>
        )}
        {recommendedMeta && (
          <div className={styles.recommendedMeta}>{recommendedMeta}</div>
        )}
        {item.recommendationPending && (
          <div className={styles.recommendationActions}>
            <button
              className={styles.acceptBtn}
              disabled={actionPending}
              onClick={() => onAccept(item)}
            >
              Accept
            </button>
            <button
              className={styles.ignoreBtn}
              disabled={actionPending}
              onClick={() => onIgnore(item)}
            >
              Ignore
            </button>
          </div>
        )}
      </td>
      <td>
        <input
          type="text"
          className={styles.notesInput}
          value={notes}
          onChange={(e) => onEdit(item._id, { notes: e.target.value })}
        />
      </td>
      <td>
        <select
          value={acceptedToValue(variable)}
          onChange={(e) =>
            onEdit(item._id, {
              variable:
                e.target.value === "inherit" ? null : e.target.value === "true",
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
            onEdit(item._id, {
              haulable:
                e.target.value === "inherit" ? null : e.target.value === "true",
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
        <LocationsCheckboxList
          locations={locations}
          acceptedLocationIds={acceptedLocationIds}
          onChange={(ids) => onEdit(item._id, { acceptedLocationIds: ids })}
        />
      </td>
    </tr>
  );
});

const CategoryRow = memo(function CategoryRow(props: {
  category: BuybackCategory;
  edit: CategoryEdit | undefined;
  locations: BuybackLocation[];
  expanded: boolean;
  items: BuybackItem[];
  itemEdits: Record<string, ItemEdit>;
  actionPendingIds: Set<string>;
  onToggleExpanded: (categoryId: string) => void;
  onCategoryEdit: (categoryId: string, edit: CategoryEdit) => void;
  onItemEdit: (itemId: string, edit: ItemEdit) => void;
  onAccept: (item: BuybackItem) => void;
  onIgnore: (item: BuybackItem) => void;
}) {
  const {
    category,
    edit,
    locations,
    expanded,
    items,
    itemEdits,
    actionPendingIds,
    onToggleExpanded,
    onCategoryEdit,
    onItemEdit,
    onAccept,
    onIgnore,
  } = props;

  const accepted =
    edit?.accepted !== undefined ? edit.accepted : category.accepted;
  const percentOffered =
    edit?.percentOffered ?? category.percentOffered.toString();
  const variable =
    edit?.variable !== undefined ? edit.variable : category.variable;
  const haulable =
    edit?.haulable !== undefined ? edit.haulable : category.haulable;
  const acceptedLocationIds =
    edit?.acceptedLocationIds !== undefined
      ? edit.acceptedLocationIds
      : category.acceptedLocationIds;
  const isDirty = Boolean(edit);
  const pendingCount = items.filter((i) => i.recommendationPending).length;

  return (
    <Fragment>
      <tr className={isDirty ? styles.rowDirty : ""}>
        <td>
          <button
            className={styles.expandButton}
            onClick={() => onToggleExpanded(category._id)}
          >
            {expanded ? "▾" : "▸"}
          </button>
        </td>
        <td>
          {category.name}
          {pendingCount > 0 && (
            <span className={styles.pendingBadge}>{pendingCount} pending</span>
          )}
        </td>
        <td>
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) =>
              onCategoryEdit(category._id, { accepted: e.target.checked })
            }
          />
        </td>
        <td>
          <input
            type="number"
            className={styles.rateInput}
            value={percentOffered}
            onChange={(e) =>
              onCategoryEdit(category._id, { percentOffered: e.target.value })
            }
          />
        </td>
        <td>
          <input
            type="checkbox"
            checked={variable}
            onChange={(e) =>
              onCategoryEdit(category._id, { variable: e.target.checked })
            }
          />
        </td>
        <td>
          <input
            type="checkbox"
            checked={haulable}
            onChange={(e) =>
              onCategoryEdit(category._id, { haulable: e.target.checked })
            }
          />
        </td>
        <td>
          <LocationsCheckboxList
            locations={locations}
            acceptedLocationIds={acceptedLocationIds}
            onChange={(ids) =>
              onCategoryEdit(category._id, { acceptedLocationIds: ids })
            }
          />
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} className={styles.detailCell}>
            {items.length === 0 ? (
              <p className={styles.muted}>No accepted items in this category.</p>
            ) : (
              <div className={styles.tableScroll}>
                <table className={styles.itemsTable}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Accepted</th>
                      <th>Rate Override</th>
                      <th>Recommended Rate</th>
                      <th>Notes</th>
                      <th>Variable</th>
                      <th>Haulable</th>
                      <th>Locations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <ItemRow
                        key={item._id}
                        item={item}
                        edit={itemEdits[item._id]}
                        showCategory={false}
                        locations={locations}
                        actionPending={actionPendingIds.has(item._id)}
                        onEdit={onItemEdit}
                        onAccept={onAccept}
                        onIgnore={onIgnore}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </td>
        </tr>
      )}
    </Fragment>
  );
});

export default function BuybackPricing() {
  const [items, setItems] = useState<BuybackItem[]>([]);
  const [locations, setLocations] = useState<BuybackLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [saving, setSaving] = useState(false);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [categoryEdits, setCategoryEdits] = useState<
    Record<string, CategoryEdit>
  >({});
  const [itemEdits, setItemEdits] = useState<Record<string, ItemEdit>>({});
  const [actionPendingIds, setActionPendingIds] = useState<Set<string>>(
    new Set(),
  );

  const [pendingOnly, setPendingOnly] = useState(false);
  const [pendingResults, setPendingResults] = useState<BuybackItem[] | null>(
    null,
  );
  const [pendingLoading, setPendingLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.searchBuybackItems({ accepted: true }),
      api.getBuybackLocations(),
    ])
      .then(([itemsRes, locationsRes]) => {
        setItems(itemsRes.data);
        setLocations(locationsRes.data);
      })
      .catch(() => setError("Failed to load accepted buyback items"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!pendingOnly) return;
    setPendingLoading(true);
    api
      .searchBuybackItems({ recommendationPending: true })
      .then(({ data }) => setPendingResults(data))
      .catch(() => setError("Failed to load pending recommendations"))
      .finally(() => setPendingLoading(false));
  }, [pendingOnly]);

  const categoryGroups = useMemo(() => {
    const map = new Map<string, { category: BuybackCategory; items: BuybackItem[] }>();
    for (const item of items) {
      const catId = item.categoryId._id;
      const existing = map.get(catId);
      if (existing) {
        existing.items.push(item);
      } else {
        map.set(catId, { category: item.categoryId, items: [item] });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.category.name.localeCompare(b.category.name),
    );
  }, [items]);

  const filteredCategoryGroups = useMemo(() => {
    if (!categorySearch.trim()) return categoryGroups;
    const q = categorySearch.trim().toLowerCase();
    return categoryGroups.filter(
      (group) =>
        group.category.name.toLowerCase().includes(q) ||
        group.items.some((item) => item.name.toLowerCase().includes(q)),
    );
  }, [categoryGroups, categorySearch]);

  const totalPendingCount = useMemo(
    () => items.filter((item) => item.recommendationPending).length,
    [items],
  );

  const dirtyCount =
    Object.keys(categoryEdits).length + Object.keys(itemEdits).length;

  const toggleExpanded = useCallback((categoryId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const setCategoryEdit = useCallback(
    (categoryId: string, edit: CategoryEdit) => {
      setCategoryEdits((prev) => ({
        ...prev,
        [categoryId]: { ...prev[categoryId], ...edit },
      }));
    },
    [],
  );

  const setItemEdit = useCallback((itemId: string, edit: ItemEdit) => {
    setItemEdits((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], ...edit },
    }));
  }, []);

  // Merges a saved item back into local state, preserving its existing
  // categoryId subdocument (the item-level PATCH response only populates a
  // partial category shape - category fields never change from this
  // endpoint anyway). Drops the item entirely if it no longer resolves
  // accepted, per the "flip accepted off -> disappears immediately" rule.
  const mergeItem = useCallback((updated: BuybackItem) => {
    setItems((prev) => {
      const withMerge = prev.map((item) =>
        item._id === updated._id
          ? { ...item, ...updated, categoryId: item.categoryId }
          : item,
      );
      return withMerge.filter(resolveAccepted);
    });
    setPendingResults((prev) =>
      prev ? prev.filter((item) => item._id !== updated._id) : prev,
    );
  }, []);

  const handleAccept = async (item: BuybackItem) => {
    if (item.recommendedRate === null) return;
    setActionPendingIds((prev) => new Set(prev).add(item._id));
    setError(null);
    try {
      const { data } = await api.updateBuybackItem(item._id, {
        rateOverride: item.recommendedRate,
        recommendationPending: false,
        dismissedRecommendedRate: null,
      });
      mergeItem(data);
      setItemEdits((prev) => {
        const next = { ...prev };
        delete next[item._id];
        return next;
      });
    } catch {
      setError(`Failed to accept the recommendation for ${item.name}`);
    } finally {
      setActionPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(item._id);
        return next;
      });
    }
  };

  const handleIgnore = async (item: BuybackItem) => {
    setActionPendingIds((prev) => new Set(prev).add(item._id));
    setError(null);
    try {
      const { data } = await api.updateBuybackItem(item._id, {
        dismissedRecommendedRate: item.recommendedRate,
        recommendationPending: false,
      });
      mergeItem(data);
    } catch {
      setError(`Failed to ignore the recommendation for ${item.name}`);
    } finally {
      setActionPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(item._id);
        return next;
      });
    }
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
        const categoryId = categoryIds[idx];
        succeededCategoryIds.add(categoryId);
        const updatedCategory = result.value.data;
        // Category fields never resolve individual item acceptance by
        // themselves - re-filter afterward so items that only inherited
        // acceptance disappear the moment the category flips off, while
        // items with an explicit accepted=true override stay visible.
        setItems((prev) =>
          prev
            .map((item) =>
              item.categoryId._id === categoryId
                ? { ...item, categoryId: updatedCategory }
                : item,
            )
            .filter(resolveAccepted),
        );
      } else {
        failures++;
      }
    });

    const succeededItemIds = new Set<string>();
    itemResults.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        succeededItemIds.add(itemIds[idx]);
        mergeItem(result.value.data);
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

  return (
    <div className={styles.container}>
      <Panel>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Buyback Pricing</h2>
          <p className={styles.hint}>
            Every category and item shown here is currently accepted by the
            buyback. Set rates, variable/haulable flags, notes and pickup
            locations here. The Recommended Rate column is advisory only -
            it never changes what a quote offers until you click Accept.
            Turning Accepted off and saving removes an item from this page;
            re-accept it from the Buyback Acceptance page to bring it back.
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
            <label className={styles.filterToggle}>
              <input
                type="checkbox"
                checked={pendingOnly}
                onChange={(e) => setPendingOnly(e.target.checked)}
              />
              Show only pending recommendations
              {totalPendingCount > 0 && (
                <span className={styles.pendingBadge}>
                  {totalPendingCount}
                </span>
              )}
            </label>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          {pendingOnly ? (
            pendingLoading ? (
              <p className={styles.muted}>Loading…</p>
            ) : !pendingResults || pendingResults.length === 0 ? (
              <p className={styles.muted}>No pending recommendations.</p>
            ) : (
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Accepted</th>
                      <th>Rate Override</th>
                      <th>Recommended Rate</th>
                      <th>Notes</th>
                      <th>Variable</th>
                      <th>Haulable</th>
                      <th>Locations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingResults.map((item) => (
                      <ItemRow
                        key={item._id}
                        item={item}
                        edit={itemEdits[item._id]}
                        showCategory={true}
                        locations={locations}
                        actionPending={actionPendingIds.has(item._id)}
                        onEdit={setItemEdit}
                        onAccept={handleAccept}
                        onIgnore={handleIgnore}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <>
              <input
                type="text"
                className={styles.search}
                placeholder="Filter categories or items…"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
              />

              {loading ? (
                <p className={styles.muted}>Loading…</p>
              ) : filteredCategoryGroups.length === 0 ? (
                <p className={styles.muted}>
                  No accepted items match this filter.
                </p>
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
                      {filteredCategoryGroups.map((group) => (
                        <CategoryRow
                          key={group.category._id}
                          category={group.category}
                          edit={categoryEdits[group.category._id]}
                          locations={locations}
                          expanded={expandedIds.has(group.category._id)}
                          items={group.items}
                          itemEdits={itemEdits}
                          actionPendingIds={actionPendingIds}
                          onToggleExpanded={toggleExpanded}
                          onCategoryEdit={setCategoryEdit}
                          onItemEdit={setItemEdit}
                          onAccept={handleAccept}
                          onIgnore={handleIgnore}
                        />
                      ))}
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
