"use client";

import { useEffect, useMemo, useState } from "react";
import Panel from "@/components/Panel/Panel";
import { api, BuybackCategory } from "@/lib/api";
import styles from "./BuybackCategories.module.css";

export default function BuybackCategories() {
  const [categories, setCategories] = useState<BuybackCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    api
      .getBuybackCategories()
      .then(({ data }) => setCategories(data))
      .catch(() => setError("Failed to load buyback categories"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.trim().toLowerCase();
    return categories.filter((category) =>
      category.name.toLowerCase().includes(q),
    );
  }, [categories, search]);

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

  const handleRateBlur = async (
    category: BuybackCategory,
    value: string,
  ) => {
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

  return (
    <div className={styles.container}>
      <Panel>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Buyback Categories</h2>
          <p className={styles.hint}>
            Every EVE item group is seeded here, unaccepted by default. Turn
            on the ones you buy back and set their rate. Individual items can
            still override both via Buyback Items.
          </p>

          <input
            type="text"
            className={styles.search}
            placeholder="Search categories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {error && <p className={styles.error}>{error}</p>}

          {loading ? (
            <p className={styles.muted}>Loading…</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Accepted</th>
                  <th>% Offered</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((category) => (
                  <tr
                    key={category._id}
                    className={
                      savingId === category._id ? styles.rowSaving : ""
                    }
                  >
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
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
    </div>
  );
}
