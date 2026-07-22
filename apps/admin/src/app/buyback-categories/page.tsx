"use client";

import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import { api, BuybackCategory, BuybackGroup, BuybackItem } from "@/lib/api";
import styles from "./BuybackCategories.module.css";

const ACCEPTED_OPTIONS = [
  { value: "inherit", label: "Inherit" },
  { value: "true", label: "Accepted" },
  { value: "false", label: "Not accepted" },
];

function acceptedToValue(accepted: boolean | null): string {
  if (accepted === null) return "inherit";
  return String(accepted);
}

type CategoryEdit = Partial<{ accepted: boolean }>;
type GroupEdit = Partial<{ accepted: boolean | null }>;
type ItemEdit = Partial<{ accepted: boolean | null }>;

const ItemRow = memo(function ItemRow(props: {
  item: BuybackItem;
  edit: ItemEdit | undefined;
  showGroup: boolean;
  onEdit: (itemId: string, edit: ItemEdit) => void;
}) {
  const { item, edit, showGroup, onEdit } = props;
  const accepted = edit?.accepted !== undefined ? edit.accepted : item.accepted;
  const isDirty = Boolean(edit);

  return (
    <tr className={isDirty ? styles.rowDirty : ""}>
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
    </tr>
  );
});

const GroupRow = memo(function GroupRow(props: {
  group: BuybackGroup;
  edit: GroupEdit | undefined;
  expanded: boolean;
  items: BuybackItem[] | undefined;
  itemEdits: Record<string, ItemEdit>;
  loadingItems: boolean;
  onToggleExpanded: (group: BuybackGroup) => void;
  onGroupEdit: (groupId: string, edit: GroupEdit) => void;
  onItemEdit: (itemId: string, edit: ItemEdit) => void;
}) {
  const {
    group,
    edit,
    expanded,
    items,
    itemEdits,
    loadingItems,
    onToggleExpanded,
    onGroupEdit,
    onItemEdit,
  } = props;

  const accepted = edit?.accepted !== undefined ? edit.accepted : group.accepted;
  const isDirty = Boolean(edit);

  return (
    <Fragment>
      <tr className={isDirty ? styles.rowDirty : ""}>
        <td>
          <button
            className={styles.expandButton}
            onClick={() => onToggleExpanded(group)}
          >
            {expanded ? "▾" : "▸"}
          </button>
        </td>
        <td data-label="Name">{group.name}</td>
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
      </tr>
      {expanded && (
        <tr>
          <td colSpan={3} className={styles.detailCell}>
            {loadingItems ? (
              <p className={styles.muted}>Loading items…</p>
            ) : items?.length === 0 ? (
              <p className={styles.muted}>No items found in this group.</p>
            ) : (
              <div className={styles.tableScroll}>
                <table className={styles.itemsTable}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Accepted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(items ?? []).map((item) => (
                      <ItemRow
                        key={item._id}
                        item={item}
                        edit={itemEdits[item._id]}
                        showGroup={false}
                        onEdit={onItemEdit}
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
  expanded: boolean;
  groups: BuybackGroup[] | undefined;
  expandedGroupIds: Set<string>;
  groupEdits: Record<string, GroupEdit>;
  itemsByGroup: Record<string, BuybackItem[]>;
  itemEdits: Record<string, ItemEdit>;
  loadingGroups: boolean;
  loadingItemsFor: Set<string>;
  onToggleExpanded: (category: BuybackCategory) => void;
  onToggleGroupExpanded: (group: BuybackGroup) => void;
  onCategoryEdit: (categoryId: string, edit: CategoryEdit) => void;
  onGroupEdit: (groupId: string, edit: GroupEdit) => void;
  onItemEdit: (itemId: string, edit: ItemEdit) => void;
}) {
  const {
    category,
    edit,
    expanded,
    groups,
    expandedGroupIds,
    groupEdits,
    itemsByGroup,
    itemEdits,
    loadingGroups,
    loadingItemsFor,
    onToggleExpanded,
    onToggleGroupExpanded,
    onCategoryEdit,
    onGroupEdit,
    onItemEdit,
  } = props;

  const accepted =
    edit?.accepted !== undefined ? edit.accepted : category.accepted;
  const isDirty = Boolean(edit);

  return (
    <Fragment>
      <tr className={isDirty ? styles.rowDirty : ""}>
        <td>
          <button
            className={styles.expandButton}
            onClick={() => onToggleExpanded(category)}
          >
            {expanded ? "▾" : "▸"}
          </button>
        </td>
        <td data-label="Name">{category.name}</td>
        <td data-label="Accepted">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) =>
              onCategoryEdit(category._id, { accepted: e.target.checked })
            }
          />
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={3} className={styles.detailCell}>
            {loadingGroups ? (
              <p className={styles.muted}>Loading groups…</p>
            ) : groups?.length === 0 ? (
              <p className={styles.muted}>No groups found in this category.</p>
            ) : (
              <div className={styles.tableScroll}>
                <table className={styles.itemsTable}>
                  <thead>
                    <tr>
                      <th></th>
                      <th>Name</th>
                      <th>Accepted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(groups ?? []).map((group) => (
                      <GroupRow
                        key={group._id}
                        group={group}
                        edit={groupEdits[group._id]}
                        expanded={expandedGroupIds.has(group._id)}
                        items={itemsByGroup[group._id]}
                        itemEdits={itemEdits}
                        loadingItems={loadingItemsFor.has(group._id)}
                        onToggleExpanded={onToggleGroupExpanded}
                        onGroupEdit={onGroupEdit}
                        onItemEdit={onItemEdit}
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

export default function BuybackCategories() {
  const [categories, setCategories] = useState<BuybackCategory[]>([]);
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
  const [groupsByCategory, setGroupsByCategory] = useState<
    Record<string, BuybackGroup[]>
  >({});
  const [itemsByGroup, setItemsByGroup] = useState<
    Record<string, BuybackItem[]>
  >({});
  const [loadingGroupsFor, setLoadingGroupsFor] = useState<Set<string>>(
    new Set(),
  );
  const [loadingItemsFor, setLoadingItemsFor] = useState<Set<string>>(
    new Set(),
  );

  const [categoryEdits, setCategoryEdits] = useState<
    Record<string, CategoryEdit>
  >({});
  const [groupEdits, setGroupEdits] = useState<Record<string, GroupEdit>>({});
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
  }, []);

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    const q = categorySearch.trim().toLowerCase();
    return categories.filter((category) =>
      category.name.toLowerCase().includes(q),
    );
  }, [categories, categorySearch]);

  const dirtyCount =
    Object.keys(categoryEdits).length +
    Object.keys(groupEdits).length +
    Object.keys(itemEdits).length;

  // Stable references (no deps) so Category/GroupRow's memoization isn't
  // invalidated for every row just because some other row was toggled.
  const toggleCategoryExpanded = useCallback((category: BuybackCategory) => {
    setExpandedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(category._id)) next.delete(category._id);
      else next.add(category._id);
      return next;
    });
  }, []);

  const toggleGroupExpanded = useCallback((group: BuybackGroup) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(group._id)) next.delete(group._id);
      else next.add(group._id);
      return next;
    });
  }, []);

  // Lazily fetch groups for any newly-expanded category that isn't cached
  // yet, and items for any newly-expanded group. Tracks attempted fetches
  // in refs (rather than just checking the cache) so a failed request
  // doesn't get retried in a loop every time these effects re-run.
  const attemptedGroupFetchRef = useRef<Set<string>>(new Set());
  const attemptedItemFetchRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    expandedCategoryIds.forEach((categoryId) => {
      if (
        groupsByCategory[categoryId] ||
        attemptedGroupFetchRef.current.has(categoryId)
      ) {
        return;
      }
      attemptedGroupFetchRef.current.add(categoryId);

      setLoadingGroupsFor((prev) => new Set(prev).add(categoryId));
      api
        .getBuybackGroups({ categoryId })
        .then(({ data }) => {
          setGroupsByCategory((prev) => ({ ...prev, [categoryId]: data }));
        })
        .catch(() => {
          setError("Failed to load groups for this category");
        })
        .finally(() => {
          setLoadingGroupsFor((prev) => {
            const next = new Set(prev);
            next.delete(categoryId);
            return next;
          });
        });
    });
  }, [expandedCategoryIds, groupsByCategory]);

  useEffect(() => {
    expandedGroupIds.forEach((groupId) => {
      if (itemsByGroup[groupId] || attemptedItemFetchRef.current.has(groupId)) {
        return;
      }
      attemptedItemFetchRef.current.add(groupId);

      setLoadingItemsFor((prev) => new Set(prev).add(groupId));
      api
        .searchBuybackItems({ groupId })
        .then(({ data }) => {
          setItemsByGroup((prev) => ({ ...prev, [groupId]: data }));
        })
        .catch(() => {
          setError("Failed to load items for this group");
        })
        .finally(() => {
          setLoadingItemsFor((prev) => {
            const next = new Set(prev);
            next.delete(groupId);
            return next;
          });
        });
    });
  }, [expandedGroupIds, itemsByGroup]);

  const patchItemInPlace = (item: BuybackItem) => {
    setItemsByGroup((prev) => {
      const groupId = item.groupId._id;
      const list = prev[groupId];
      if (!list) return prev;
      return {
        ...prev,
        [groupId]: list.map((i) => (i._id === item._id ? item : i)),
      };
    });
    setItemSearchResults((prev) =>
      prev ? prev.map((i) => (i._id === item._id ? item : i)) : prev,
    );
  };

  const patchGroupInPlace = (group: BuybackGroup) => {
    setGroupsByCategory((prev) => {
      const categoryId = group.categoryId._id;
      const list = prev[categoryId];
      if (!list) return prev;
      return {
        ...prev,
        [categoryId]: list.map((g) => (g._id === group._id ? group : g)),
      };
    });
  };

  // Stable references (no deps) so Category/Group/ItemRow's memoization
  // isn't invalidated on every render just because the parent re-rendered.
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
    const groupIds = Object.keys(groupEdits);
    const itemIds = Object.keys(itemEdits);

    const categoryResults = await Promise.allSettled(
      categoryIds.map((id) => {
        const edit = categoryEdits[id];
        const payload: { accepted?: boolean } = {};
        if (edit.accepted !== undefined) payload.accepted = edit.accepted;
        return api.updateBuybackCategory(id, payload);
      }),
    );

    const groupResults = await Promise.allSettled(
      groupIds.map((id) => {
        const edit = groupEdits[id];
        const payload: { accepted?: boolean | null } = {};
        if (edit.accepted !== undefined) payload.accepted = edit.accepted;
        return api.updateBuybackGroup(id, payload);
      }),
    );

    const itemResults = await Promise.allSettled(
      itemIds.map((id) => {
        const edit = itemEdits[id];
        const payload: { accepted?: boolean | null } = {};
        if (edit.accepted !== undefined) payload.accepted = edit.accepted;
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

    const succeededGroupIds = new Set<string>();
    groupResults.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        succeededGroupIds.add(groupIds[idx]);
        patchGroupInPlace(result.value.data);
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
          <h2 className={styles.sectionTitle}>Buyback Acceptance</h2>
          <p className={styles.hint}>
            Every EVE item category and group is seeded here, unaccepted by
            default. Turn on the ones you buy back, then expand a category to
            browse its groups, and a group to browse its items, ticking
            individual ones that need to differ from the default they&apos;d
            otherwise inherit. Pricing, the Haul flag, notes and locations are
            set on the Buyback Pricing page for accepted items only. Nothing
            is saved until you click Save Changes.
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
                      <th>Group</th>
                      <th>Accepted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemSearchResults.map((item) => (
                      <ItemRow
                        key={item._id}
                        item={item}
                        edit={itemEdits[item._id]}
                        showGroup={true}
                        onEdit={setItemEdit}
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
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCategories.map((category) => (
                        <CategoryRow
                          key={category._id}
                          category={category}
                          edit={categoryEdits[category._id]}
                          expanded={expandedCategoryIds.has(category._id)}
                          groups={groupsByCategory[category._id]}
                          expandedGroupIds={expandedGroupIds}
                          groupEdits={groupEdits}
                          itemsByGroup={itemsByGroup}
                          itemEdits={itemEdits}
                          loadingGroups={loadingGroupsFor.has(category._id)}
                          loadingItemsFor={loadingItemsFor}
                          onToggleExpanded={toggleCategoryExpanded}
                          onToggleGroupExpanded={toggleGroupExpanded}
                          onCategoryEdit={setCategoryEdit}
                          onGroupEdit={setGroupEdit}
                          onItemEdit={setItemEdit}
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
