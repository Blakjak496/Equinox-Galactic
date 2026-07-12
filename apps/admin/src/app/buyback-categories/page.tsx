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
  onEdit: (itemId: string, edit: ItemEdit) => void;
}) {
  const { item, edit, showCategory, locations, onEdit } = props;
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

  return (
    <tr className={isDirty ? styles.rowDirty : ""}>
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
  items: BuybackItem[] | undefined;
  itemEdits: Record<string, ItemEdit>;
  loadingItems: boolean;
  onToggleExpanded: (category: BuybackCategory) => void;
  onCategoryEdit: (categoryId: string, edit: CategoryEdit) => void;
  onItemEdit: (itemId: string, edit: ItemEdit) => void;
}) {
  const {
    category,
    edit,
    locations,
    expanded,
    items,
    itemEdits,
    loadingItems,
    onToggleExpanded,
    onCategoryEdit,
    onItemEdit,
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
        <td>{category.name}</td>
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
            {loadingItems ? (
              <p className={styles.muted}>Loading items…</p>
            ) : items?.length === 0 ? (
              <p className={styles.muted}>No items found in this category.</p>
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
                    {(items ?? []).map((item) => (
                      <ItemRow
                        key={item._id}
                        item={item}
                        edit={itemEdits[item._id]}
                        showCategory={false}
                        locations={locations}
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

  // Stable reference (no deps) so CategoryRow's memoization isn't
  // invalidated for every row just because some other row was toggled.
  const toggleExpanded = useCallback((category: BuybackCategory) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(category._id)) {
        next.delete(category._id);
      } else {
        next.add(category._id);
      }
      return next;
    });
  }, []);

  // Lazily fetch items for any newly-expanded category that isn't cached
  // yet. Decoupled from toggleExpanded so that function can stay a stable,
  // dependency-free callback. Tracks attempted fetches in a ref (rather than
  // just checking itemsByCategory) so a failed request doesn't get retried
  // in a loop every time this effect re-runs.
  const attemptedFetchRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    expandedIds.forEach((categoryId) => {
      if (
        itemsByCategory[categoryId] ||
        attemptedFetchRef.current.has(categoryId)
      ) {
        return;
      }
      attemptedFetchRef.current.add(categoryId);

      setLoadingItemsFor((prev) => new Set(prev).add(categoryId));
      api
        .searchBuybackItems({ categoryId })
        .then(({ data }) => {
          setItemsByCategory((prev) => ({ ...prev, [categoryId]: data }));
        })
        .catch(() => {
          setError("Failed to load items for this category");
        })
        .finally(() => {
          setLoadingItemsFor((prev) => {
            const next = new Set(prev);
            next.delete(categoryId);
            return next;
          });
        });
    });
  }, [expandedIds, itemsByCategory]);

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

  // Stable references (no deps) so CategoryRow/ItemRow's memoization isn't
  // invalidated on every render just because the parent re-rendered.
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
                    {itemSearchResults.map((item) => (
                      <ItemRow
                        key={item._id}
                        item={item}
                        edit={itemEdits[item._id]}
                        showCategory={true}
                        locations={locations}
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
                        <th>% Offered</th>
                        <th>Variable</th>
                        <th>Haulable</th>
                        <th>Locations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCategories.map((category) => (
                        <CategoryRow
                          key={category._id}
                          category={category}
                          edit={categoryEdits[category._id]}
                          locations={locations}
                          expanded={expandedIds.has(category._id)}
                          items={itemsByCategory[category._id]}
                          itemEdits={itemEdits}
                          loadingItems={loadingItemsFor.has(category._id)}
                          onToggleExpanded={toggleExpanded}
                          onCategoryEdit={setCategoryEdit}
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
