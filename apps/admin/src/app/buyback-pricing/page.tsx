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

const REPROCESSING_OPTIONS = [
  { value: "none", label: "None (normal pricing)" },
  { value: "ore_ice", label: "Ore / Ice" },
  { value: "gas", label: "Gas" },
  { value: "scrap", label: "Scrap" },
];

function reprocessingToValue(
  category: "ore_ice" | "gas" | "scrap" | null,
): string {
  return category ?? "none";
}

function reprocessingFromValue(
  value: string,
): "ore_ice" | "gas" | "scrap" | null {
  return value === "none" ? null : (value as "ore_ice" | "gas" | "scrap");
}

function resolveAccepted(item: BuybackItem): boolean {
  return (item.accepted ?? item.categoryId.accepted) === true;
}

function acceptRecommendationPatch(item: BuybackItem) {
  return {
    rateOverride: item.recommendedRate,
    recommendationPending: false,
    dismissedRecommendedRate: null,
  };
}

function ignoreRecommendationPatch(item: BuybackItem) {
  return {
    dismissedRecommendedRate: item.recommendedRate,
    recommendationPending: false,
  };
}

function formatRecommendedMeta(item: BuybackItem): string | null {
  // Items never processed by a pricing run don't just have this null -
  // they can be missing the field entirely (undefined), since it didn't
  // exist in the schema when they were first seeded and Mongoose's
  // aggregate() (unlike find()) never backfills schema defaults.
  if (item.recommendedRateUpdatedAt == null) return null;
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
  haul: boolean;
  acceptedLocationIds: string[] | null;
}>;
type ItemEdit = Partial<{
  accepted: boolean | null;
  rateOverride: string;
  notes: string;
  haul: boolean | null;
  acceptedLocationIds: string[] | null;
  reprocessingCategory: "ore_ice" | "gas" | "scrap" | null;
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
  const haul = edit?.haul !== undefined ? edit.haul : item.haul;
  const acceptedLocationIds =
    edit?.acceptedLocationIds !== undefined
      ? edit.acceptedLocationIds
      : item.acceptedLocationIds;
  const reprocessingCategory =
    edit?.reprocessingCategory !== undefined
      ? edit.reprocessingCategory
      : item.reprocessingCategory;
  const isDirty = Boolean(edit);
  const rowClass = item.recommendationPending
    ? styles.rowPending
    : isDirty
      ? styles.rowDirty
      : "";
  const recommendedMeta = formatRecommendedMeta(item);

  return (
    <tr className={rowClass}>
      <td data-label="Name">{item.name}</td>
      {showCategory && (
        <td data-label="Category">{item.categoryId.name}</td>
      )}
      <td data-label="Accepted">
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
      <td data-label="Rate Override">
        <input
          type="number"
          className={styles.rateInput}
          placeholder="inherit"
          value={rateOverride}
          onChange={(e) => onEdit(item._id, { rateOverride: e.target.value })}
        />
      </td>
      <td data-label="Recommended Rate" className={styles.recommendedCell}>
        {item.recommendedRate == null ? (
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
      <td data-label="Notes">
        <input
          type="text"
          className={styles.notesInput}
          value={notes}
          onChange={(e) => onEdit(item._id, { notes: e.target.value })}
        />
      </td>
      <td data-label="Haul">
        <select
          value={acceptedToValue(haul)}
          onChange={(e) =>
            onEdit(item._id, {
              haul:
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
      <td data-label="Locations">
        <LocationsCheckboxList
          locations={locations}
          acceptedLocationIds={acceptedLocationIds}
          onChange={(ids) => onEdit(item._id, { acceptedLocationIds: ids })}
        />
      </td>
      <td data-label="Reprocessing">
        <select
          value={reprocessingToValue(reprocessingCategory)}
          onChange={(e) =>
            onEdit(item._id, {
              reprocessingCategory: reprocessingFromValue(e.target.value),
            })
          }
        >
          {REPROCESSING_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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
  categoryActionPending: boolean;
  onToggleExpanded: (categoryId: string) => void;
  onCategoryEdit: (categoryId: string, edit: CategoryEdit) => void;
  onItemEdit: (itemId: string, edit: ItemEdit) => void;
  onAccept: (item: BuybackItem) => void;
  onIgnore: (item: BuybackItem) => void;
  onAcceptCategory: (categoryId: string, items: BuybackItem[]) => void;
  onIgnoreCategory: (categoryId: string, items: BuybackItem[]) => void;
}) {
  const {
    category,
    edit,
    locations,
    expanded,
    items,
    itemEdits,
    actionPendingIds,
    categoryActionPending,
    onToggleExpanded,
    onCategoryEdit,
    onItemEdit,
    onAccept,
    onIgnore,
    onAcceptCategory,
    onIgnoreCategory,
  } = props;

  const accepted =
    edit?.accepted !== undefined ? edit.accepted : category.accepted;
  const percentOffered =
    edit?.percentOffered ?? category.percentOffered.toString();
  const haul = edit?.haul !== undefined ? edit.haul : category.haul;
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
        <td data-label="Name">
          {category.name}
          {pendingCount > 0 && (
            <span className={styles.pendingBadge}>{pendingCount} pending</span>
          )}
          {pendingCount > 0 && (
            <div className={styles.recommendationActions}>
              <button
                className={styles.acceptBtn}
                disabled={categoryActionPending}
                onClick={() => onAcceptCategory(category._id, items)}
              >
                Accept All
              </button>
              <button
                className={styles.ignoreBtn}
                disabled={categoryActionPending}
                onClick={() => onIgnoreCategory(category._id, items)}
              >
                Ignore All
              </button>
            </div>
          )}
        </td>
        <td data-label="Accepted">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) =>
              onCategoryEdit(category._id, { accepted: e.target.checked })
            }
          />
        </td>
        <td data-label="% Offered">
          <input
            type="number"
            className={styles.rateInput}
            value={percentOffered}
            onChange={(e) =>
              onCategoryEdit(category._id, { percentOffered: e.target.value })
            }
          />
        </td>
        <td data-label="Haul">
          <input
            type="checkbox"
            checked={haul}
            onChange={(e) =>
              onCategoryEdit(category._id, { haul: e.target.checked })
            }
          />
        </td>
        <td data-label="Locations">
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
                      <th>Haul</th>
                      <th>Locations</th>
                      <th>Reprocessing</th>
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
  const [categoryActionPendingIds, setCategoryActionPendingIds] = useState<
    Set<string>
  >(new Set());

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
    if (item.recommendedRate == null) return;
    setActionPendingIds((prev) => new Set(prev).add(item._id));
    setError(null);
    try {
      const { data } = await api.updateBuybackItem(
        item._id,
        acceptRecommendationPatch(item),
      );
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
      const { data } = await api.updateBuybackItem(
        item._id,
        ignoreRecommendationPatch(item),
      );
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

  // Shared by both category-level batch actions below: fires one PATCH per
  // pending item in the category in parallel, rather than requiring the
  // operator to click Accept/Ignore on each row individually.
  const runCategoryRecommendationAction = async (
    categoryId: string,
    categoryItems: BuybackItem[],
    buildPatch: (item: BuybackItem) => Record<string, unknown>,
    actionLabel: string,
  ) => {
    const pendingItems = categoryItems.filter(
      (item) => item.recommendationPending,
    );
    if (pendingItems.length === 0) return;

    setCategoryActionPendingIds((prev) => new Set(prev).add(categoryId));
    setActionPendingIds((prev) => {
      const next = new Set(prev);
      pendingItems.forEach((item) => next.add(item._id));
      return next;
    });
    setError(null);

    const results = await Promise.allSettled(
      pendingItems.map((item) =>
        api.updateBuybackItem(item._id, buildPatch(item)),
      ),
    );

    let failures = 0;
    results.forEach((result, idx) => {
      const itemId = pendingItems[idx]._id;
      if (result.status === "fulfilled") {
        mergeItem(result.value.data);
        setItemEdits((prev) => {
          const next = { ...prev };
          delete next[itemId];
          return next;
        });
      } else {
        failures++;
      }
    });

    if (failures > 0) {
      setError(
        `Failed to ${actionLabel} ${failures} recommendation${failures === 1 ? "" : "s"} in this category.`,
      );
    }

    setCategoryActionPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(categoryId);
      return next;
    });
    setActionPendingIds((prev) => {
      const next = new Set(prev);
      pendingItems.forEach((item) => next.delete(item._id));
      return next;
    });
  };

  const handleAcceptCategory = (categoryId: string, categoryItems: BuybackItem[]) =>
    runCategoryRecommendationAction(
      categoryId,
      categoryItems,
      acceptRecommendationPatch,
      "accept",
    );

  const handleIgnoreCategory = (categoryId: string, categoryItems: BuybackItem[]) =>
    runCategoryRecommendationAction(
      categoryId,
      categoryItems,
      ignoreRecommendationPatch,
      "ignore",
    );

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
          haul?: boolean;
          acceptedLocationIds?: string[] | null;
        } = {};
        if (edit.accepted !== undefined) payload.accepted = edit.accepted;
        if (edit.percentOffered !== undefined)
          payload.percentOffered = Number(edit.percentOffered);
        if (edit.haul !== undefined) payload.haul = edit.haul;
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
          haul?: boolean | null;
          acceptedLocationIds?: string[] | null;
          reprocessingCategory?: "ore_ice" | "gas" | "scrap" | null;
        } = {};
        if (edit.accepted !== undefined) payload.accepted = edit.accepted;
        if (edit.rateOverride !== undefined)
          payload.rateOverride =
            edit.rateOverride.trim() === "" ? null : Number(edit.rateOverride);
        if (edit.notes !== undefined)
          payload.notes = edit.notes.trim() === "" ? null : edit.notes;
        if (edit.haul !== undefined) payload.haul = edit.haul;
        if (edit.acceptedLocationIds !== undefined)
          payload.acceptedLocationIds = edit.acceptedLocationIds;
        if (edit.reprocessingCategory !== undefined)
          payload.reprocessingCategory = edit.reprocessingCategory;
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
            buyback. Set rates, the Haul flag, notes and pickup
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
                      <th>Haul</th>
                      <th>Locations</th>
                      <th>Reprocessing</th>
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
                        <th>Haul</th>
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
                          categoryActionPending={categoryActionPendingIds.has(
                            group.category._id,
                          )}
                          onToggleExpanded={toggleExpanded}
                          onCategoryEdit={setCategoryEdit}
                          onItemEdit={setItemEdit}
                          onAccept={handleAccept}
                          onIgnore={handleIgnore}
                          onAcceptCategory={handleAcceptCategory}
                          onIgnoreCategory={handleIgnoreCategory}
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
