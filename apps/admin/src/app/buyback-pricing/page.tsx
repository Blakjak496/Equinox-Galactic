"use client";

import { Fragment, memo, useCallback, useEffect, useMemo, useState } from "react";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import {
  api,
  BuybackCategory,
  BuybackGroup,
  BuybackItem,
  BuybackLocation,
} from "@/lib/api";
import styles from "./BuybackPricing.module.css";

const ACCEPTED_OPTIONS = [
  { value: "inherit", label: "Inherit" },
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
  return (
    item.accepted ?? item.groupId.accepted ?? item.groupId.categoryId.accepted
  ) === true;
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
type GroupEdit = Partial<{
  accepted: boolean | null;
  percentOffered: string;
  haul: boolean | null;
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
  showGroup: boolean;
  locations: BuybackLocation[];
  actionPending: boolean;
  onEdit: (itemId: string, edit: ItemEdit) => void;
  onAccept: (item: BuybackItem) => void;
  onIgnore: (item: BuybackItem) => void;
}) {
  const {
    item,
    edit,
    showGroup,
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
      {showGroup && <td data-label="Group">{item.groupId.name}</td>}
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

const GroupRow = memo(function GroupRow(props: {
  group: BuybackGroup;
  edit: GroupEdit | undefined;
  locations: BuybackLocation[];
  expanded: boolean;
  items: BuybackItem[];
  itemEdits: Record<string, ItemEdit>;
  actionPendingIds: Set<string>;
  groupActionPending: boolean;
  resetPending: boolean;
  onToggleExpanded: (groupId: string) => void;
  onGroupEdit: (groupId: string, edit: GroupEdit) => void;
  onItemEdit: (itemId: string, edit: ItemEdit) => void;
  onAccept: (item: BuybackItem) => void;
  onIgnore: (item: BuybackItem) => void;
  onAcceptGroup: (groupId: string, items: BuybackItem[]) => void;
  onIgnoreGroup: (groupId: string, items: BuybackItem[]) => void;
  onResetToInherit: (group: BuybackGroup) => void;
}) {
  const {
    group,
    edit,
    locations,
    expanded,
    items,
    itemEdits,
    actionPendingIds,
    groupActionPending,
    resetPending,
    onToggleExpanded,
    onGroupEdit,
    onItemEdit,
    onAccept,
    onIgnore,
    onAcceptGroup,
    onIgnoreGroup,
    onResetToInherit,
  } = props;

  const accepted = edit?.accepted !== undefined ? edit.accepted : group.accepted;
  const percentOffered =
    edit?.percentOffered ?? group.percentOffered?.toString() ?? "";
  const haul = edit?.haul !== undefined ? edit.haul : group.haul;
  const acceptedLocationIds =
    edit?.acceptedLocationIds !== undefined
      ? edit.acceptedLocationIds
      : group.acceptedLocationIds;
  const isDirty = Boolean(edit);
  const pendingCount = items.filter((i) => i.recommendationPending).length;

  return (
    <Fragment>
      <tr className={isDirty ? styles.rowDirty : ""}>
        <td>
          <button
            className={styles.expandButton}
            onClick={() => onToggleExpanded(group._id)}
          >
            {expanded ? "▾" : "▸"}
          </button>
        </td>
        <td data-label="Name">
          {group.name}
          {pendingCount > 0 && (
            <span className={styles.pendingBadge}>{pendingCount} pending</span>
          )}
          <div className={styles.recommendationActions}>
            {pendingCount > 0 && (
              <>
                <button
                  className={styles.acceptBtn}
                  disabled={groupActionPending}
                  onClick={() => onAcceptGroup(group._id, items)}
                >
                  Accept All
                </button>
                <button
                  className={styles.ignoreBtn}
                  disabled={groupActionPending}
                  onClick={() => onIgnoreGroup(group._id, items)}
                >
                  Ignore All
                </button>
              </>
            )}
            <button
              className={styles.ignoreBtn}
              disabled={resetPending}
              onClick={() => onResetToInherit(group)}
              title="Clear this group's settings so it inherits from its category"
            >
              Reset to inherit
            </button>
          </div>
        </td>
        <td data-label="Accepted">
          <select
            value={acceptedToValue(accepted)}
            onChange={(e) =>
              onGroupEdit(group._id, {
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
        <td data-label="% Offered">
          <input
            type="number"
            className={styles.rateInput}
            placeholder="inherit"
            value={percentOffered}
            onChange={(e) =>
              onGroupEdit(group._id, { percentOffered: e.target.value })
            }
          />
        </td>
        <td data-label="Haul">
          <select
            value={acceptedToValue(haul)}
            onChange={(e) =>
              onGroupEdit(group._id, {
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
            onChange={(ids) =>
              onGroupEdit(group._id, { acceptedLocationIds: ids })
            }
          />
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className={styles.detailCell}>
            {items.length === 0 ? (
              <p className={styles.muted}>No accepted items in this group.</p>
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
                        showGroup={false}
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

const CategoryRow = memo(function CategoryRow(props: {
  category: BuybackCategory;
  edit: CategoryEdit | undefined;
  locations: BuybackLocation[];
  expanded: boolean;
  groups: { group: BuybackGroup; items: BuybackItem[] }[];
  expandedGroupIds: Set<string>;
  groupEdits: Record<string, GroupEdit>;
  itemEdits: Record<string, ItemEdit>;
  actionPendingIds: Set<string>;
  categoryActionPending: boolean;
  groupActionPendingIds: Set<string>;
  groupResetPendingIds: Set<string>;
  onToggleExpanded: (categoryId: string) => void;
  onToggleGroupExpanded: (groupId: string) => void;
  onCategoryEdit: (categoryId: string, edit: CategoryEdit) => void;
  onGroupEdit: (groupId: string, edit: GroupEdit) => void;
  onItemEdit: (itemId: string, edit: ItemEdit) => void;
  onAccept: (item: BuybackItem) => void;
  onIgnore: (item: BuybackItem) => void;
  onAcceptGroup: (groupId: string, items: BuybackItem[]) => void;
  onIgnoreGroup: (groupId: string, items: BuybackItem[]) => void;
  onAcceptCategory: (categoryId: string, items: BuybackItem[]) => void;
  onIgnoreCategory: (categoryId: string, items: BuybackItem[]) => void;
  onResetGroupToInherit: (group: BuybackGroup) => void;
}) {
  const {
    category,
    edit,
    locations,
    expanded,
    groups,
    expandedGroupIds,
    groupEdits,
    itemEdits,
    actionPendingIds,
    categoryActionPending,
    groupActionPendingIds,
    groupResetPendingIds,
    onToggleExpanded,
    onToggleGroupExpanded,
    onCategoryEdit,
    onGroupEdit,
    onItemEdit,
    onAccept,
    onIgnore,
    onAcceptGroup,
    onIgnoreGroup,
    onAcceptCategory,
    onIgnoreCategory,
    onResetGroupToInherit,
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
  const allItems = groups.flatMap((g) => g.items);
  const pendingCount = allItems.filter((i) => i.recommendationPending).length;

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
                onClick={() => onAcceptCategory(category._id, allItems)}
              >
                Accept All
              </button>
              <button
                className={styles.ignoreBtn}
                disabled={categoryActionPending}
                onClick={() => onIgnoreCategory(category._id, allItems)}
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
          <td colSpan={6} className={styles.detailCell}>
            {groups.length === 0 ? (
              <p className={styles.muted}>No accepted groups in this category.</p>
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
                    {groups.map(({ group, items }) => (
                      <GroupRow
                        key={group._id}
                        group={group}
                        edit={groupEdits[group._id]}
                        locations={locations}
                        expanded={expandedGroupIds.has(group._id)}
                        items={items}
                        itemEdits={itemEdits}
                        actionPendingIds={actionPendingIds}
                        groupActionPending={groupActionPendingIds.has(group._id)}
                        resetPending={groupResetPendingIds.has(group._id)}
                        onToggleExpanded={onToggleGroupExpanded}
                        onGroupEdit={onGroupEdit}
                        onItemEdit={onItemEdit}
                        onAccept={onAccept}
                        onIgnore={onIgnore}
                        onAcceptGroup={onAcceptGroup}
                        onIgnoreGroup={onIgnoreGroup}
                        onResetToInherit={onResetGroupToInherit}
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

  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(
    new Set(),
  );
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(
    new Set(),
  );
  const [categoryEdits, setCategoryEdits] = useState<
    Record<string, CategoryEdit>
  >({});
  const [groupEdits, setGroupEdits] = useState<Record<string, GroupEdit>>({});
  const [itemEdits, setItemEdits] = useState<Record<string, ItemEdit>>({});
  const [actionPendingIds, setActionPendingIds] = useState<Set<string>>(
    new Set(),
  );
  const [categoryActionPendingIds, setCategoryActionPendingIds] = useState<
    Set<string>
  >(new Set());
  const [groupActionPendingIds, setGroupActionPendingIds] = useState<
    Set<string>
  >(new Set());
  const [groupResetPendingIds, setGroupResetPendingIds] = useState<
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
    const groupMap = new Map<
      string,
      { group: BuybackGroup; items: BuybackItem[] }
    >();
    for (const item of items) {
      const gId = item.groupId._id;
      const existing = groupMap.get(gId);
      if (existing) {
        existing.items.push(item);
      } else {
        groupMap.set(gId, { group: item.groupId, items: [item] });
      }
    }

    const categoryMap = new Map<
      string,
      {
        category: BuybackCategory;
        groups: { group: BuybackGroup; items: BuybackItem[] }[];
      }
    >();
    for (const entry of groupMap.values()) {
      const cId = entry.group.categoryId._id;
      const existing = categoryMap.get(cId);
      if (existing) {
        existing.groups.push(entry);
      } else {
        categoryMap.set(cId, {
          category: entry.group.categoryId,
          groups: [entry],
        });
      }
    }

    return Array.from(categoryMap.values())
      .map((c) => ({
        ...c,
        groups: c.groups.sort((a, b) => a.group.name.localeCompare(b.group.name)),
      }))
      .sort((a, b) => a.category.name.localeCompare(b.category.name));
  }, [items]);

  const filteredCategoryGroups = useMemo(() => {
    if (!categorySearch.trim()) return categoryGroups;
    const q = categorySearch.trim().toLowerCase();
    return categoryGroups
      .map((c) => {
        const categoryMatches = c.category.name.toLowerCase().includes(q);
        const groups = categoryMatches
          ? c.groups
          : c.groups.filter(
              (g) =>
                g.group.name.toLowerCase().includes(q) ||
                g.items.some((item) => item.name.toLowerCase().includes(q)),
            );
        return { ...c, groups };
      })
      .filter((c) => c.groups.length > 0);
  }, [categoryGroups, categorySearch]);

  const totalPendingCount = useMemo(
    () => items.filter((item) => item.recommendationPending).length,
    [items],
  );

  const dirtyCount =
    Object.keys(categoryEdits).length +
    Object.keys(groupEdits).length +
    Object.keys(itemEdits).length;

  // Stable references (no deps) so Category/GroupRow's memoization isn't
  // invalidated for every row just because some other row was toggled.
  const toggleCategoryExpanded = useCallback((categoryId: string) => {
    setExpandedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }, []);

  const toggleGroupExpanded = useCallback((groupId: string) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
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

  const setGroupEdit = useCallback((groupId: string, edit: GroupEdit) => {
    setGroupEdits((prev) => ({
      ...prev,
      [groupId]: { ...prev[groupId], ...edit },
    }));
  }, []);

  const setItemEdit = useCallback((itemId: string, edit: ItemEdit) => {
    setItemEdits((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], ...edit },
    }));
  }, []);

  // The item PATCH response now comes back with a fully nested-populated
  // groupId (group -> its category), since the backend's populate select
  // list covers every inheritable field - no need to manually re-attach the
  // old item's groupId anymore. Drops the item entirely if it no longer
  // resolves accepted, per the "flip accepted off -> disappears
  // immediately" rule.
  const mergeItem = useCallback((updated: BuybackItem) => {
    setItems((prev) => {
      const withMerge = prev.map((item) =>
        item._id === updated._id ? updated : item,
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

  // Shared by group- and category-level batch actions below: fires one
  // PATCH per pending item in parallel, rather than requiring the operator
  // to click Accept/Ignore on each row individually.
  const runRecommendationAction = async (
    scopeItems: BuybackItem[],
    buildPatch: (item: BuybackItem) => Record<string, unknown>,
    actionLabel: string,
    scopeLabel: string,
  ) => {
    const pendingItems = scopeItems.filter((item) => item.recommendationPending);
    if (pendingItems.length === 0) return;

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
        `Failed to ${actionLabel} ${failures} recommendation${failures === 1 ? "" : "s"} in this ${scopeLabel}.`,
      );
    }

    setActionPendingIds((prev) => {
      const next = new Set(prev);
      pendingItems.forEach((item) => next.delete(item._id));
      return next;
    });
  };

  const handleAcceptGroup = async (groupId: string, groupItems: BuybackItem[]) => {
    setGroupActionPendingIds((prev) => new Set(prev).add(groupId));
    await runRecommendationAction(
      groupItems,
      acceptRecommendationPatch,
      "accept",
      "group",
    );
    setGroupActionPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(groupId);
      return next;
    });
  };

  const handleIgnoreGroup = async (groupId: string, groupItems: BuybackItem[]) => {
    setGroupActionPendingIds((prev) => new Set(prev).add(groupId));
    await runRecommendationAction(
      groupItems,
      ignoreRecommendationPatch,
      "ignore",
      "group",
    );
    setGroupActionPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(groupId);
      return next;
    });
  };

  const handleAcceptCategory = async (
    categoryId: string,
    categoryItems: BuybackItem[],
  ) => {
    setCategoryActionPendingIds((prev) => new Set(prev).add(categoryId));
    await runRecommendationAction(
      categoryItems,
      acceptRecommendationPatch,
      "accept",
      "category",
    );
    setCategoryActionPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(categoryId);
      return next;
    });
  };

  const handleIgnoreCategory = async (
    categoryId: string,
    categoryItems: BuybackItem[],
  ) => {
    setCategoryActionPendingIds((prev) => new Set(prev).add(categoryId));
    await runRecommendationAction(
      categoryItems,
      ignoreRecommendationPatch,
      "ignore",
      "category",
    );
    setCategoryActionPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(categoryId);
      return next;
    });
  };

  // One-click consolidation: clears every override on a group so it starts
  // inheriting from its category immediately, instead of requiring the
  // operator to null out all four fields by hand. This is what actually
  // makes "change the price for all ore in one place" achievable, since
  // every existing group starts with concrete migrated-over values.
  const handleResetGroupToInherit = async (group: BuybackGroup) => {
    setGroupResetPendingIds((prev) => new Set(prev).add(group._id));
    setError(null);
    try {
      const { data } = await api.updateBuybackGroup(group._id, {
        accepted: null,
        percentOffered: null,
        haul: null,
        acceptedLocationIds: null,
      });
      setItems((prev) =>
        prev
          .map((item) =>
            item.groupId._id === group._id ? { ...item, groupId: data } : item,
          )
          .filter(resolveAccepted),
      );
      setGroupEdits((prev) => {
        const next = { ...prev };
        delete next[group._id];
        return next;
      });
    } catch {
      setError(`Failed to reset ${group.name} to inherit from its category`);
    } finally {
      setGroupResetPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(group._id);
        return next;
      });
    }
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    setError(null);

    const categoryIds = Object.keys(categoryEdits);
    const groupIds = Object.keys(groupEdits);
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

    const groupResults = await Promise.allSettled(
      groupIds.map((id) => {
        const edit = groupEdits[id];
        const payload: {
          accepted?: boolean | null;
          percentOffered?: number | null;
          haul?: boolean | null;
          acceptedLocationIds?: string[] | null;
        } = {};
        if (edit.accepted !== undefined) payload.accepted = edit.accepted;
        if (edit.percentOffered !== undefined)
          payload.percentOffered =
            edit.percentOffered.trim() === "" ? null : Number(edit.percentOffered);
        if (edit.haul !== undefined) payload.haul = edit.haul;
        if (edit.acceptedLocationIds !== undefined)
          payload.acceptedLocationIds = edit.acceptedLocationIds;
        return api.updateBuybackGroup(id, payload);
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
        // items with an explicit override anywhere below stay visible.
        setItems((prev) =>
          prev
            .map((item) =>
              item.groupId.categoryId._id === categoryId
                ? {
                    ...item,
                    groupId: { ...item.groupId, categoryId: updatedCategory },
                  }
                : item,
            )
            .filter(resolveAccepted),
        );
      } else {
        failures++;
      }
    });

    const succeededGroupIds = new Set<string>();
    groupResults.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        const groupId = groupIds[idx];
        succeededGroupIds.add(groupId);
        const updatedGroup = result.value.data;
        setItems((prev) =>
          prev
            .map((item) =>
              item.groupId._id === groupId
                ? { ...item, groupId: updatedGroup }
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
    setGroupEdits((prev) => {
      const next = { ...prev };
      succeededGroupIds.forEach((id) => delete next[id]);
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
            Every category, group and item shown here is currently accepted
            by the buyback. Set rates, the Haul flag, notes and pickup
            locations here - a category setting applies to every group
            underneath it that hasn&apos;t been individually overridden, and a
            group setting applies to every item underneath it the same way.
            The Recommended Rate column is advisory only - it never changes
            what a quote offers until you click Accept. Turning Accepted off
            and saving removes an item from this page; re-accept it from the
            Buyback Acceptance page to bring it back.
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
                      <th>Group</th>
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
                        showGroup={true}
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
                placeholder="Filter categories, groups or items…"
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
                      {filteredCategoryGroups.map((c) => (
                        <CategoryRow
                          key={c.category._id}
                          category={c.category}
                          edit={categoryEdits[c.category._id]}
                          locations={locations}
                          expanded={expandedCategoryIds.has(c.category._id)}
                          groups={c.groups}
                          expandedGroupIds={expandedGroupIds}
                          groupEdits={groupEdits}
                          itemEdits={itemEdits}
                          actionPendingIds={actionPendingIds}
                          categoryActionPending={categoryActionPendingIds.has(
                            c.category._id,
                          )}
                          groupActionPendingIds={groupActionPendingIds}
                          groupResetPendingIds={groupResetPendingIds}
                          onToggleExpanded={toggleCategoryExpanded}
                          onToggleGroupExpanded={toggleGroupExpanded}
                          onCategoryEdit={setCategoryEdit}
                          onGroupEdit={setGroupEdit}
                          onItemEdit={setItemEdit}
                          onAccept={handleAccept}
                          onIgnore={handleIgnore}
                          onAcceptGroup={handleAcceptGroup}
                          onIgnoreGroup={handleIgnoreGroup}
                          onAcceptCategory={handleAcceptCategory}
                          onIgnoreCategory={handleIgnoreCategory}
                          onResetGroupToInherit={handleResetGroupToInherit}
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
