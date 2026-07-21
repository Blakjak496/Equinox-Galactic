"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import { api, ShipCategory } from "@/lib/api";
import styles from "./ShipCategories.module.css";

const EMPTY_FORM = {
  name: "",
  jumpRangeLY: 10,
};

export default function ShipCategories() {
  const [shipCategories, setShipCategories] = useState<ShipCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<ShipCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchShipCategories = () => {
    api
      .getShipCategories()
      .then(({ data }) => setShipCategories(data))
      .catch(() => setError("Failed to load ship categories"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchShipCategories();
  }, []);

  const handleEdit = (shipCategory: ShipCategory) => {
    setEditTarget(shipCategory);
    setForm({
      name: shipCategory.name,
      jumpRangeLY: shipCategory.jumpRangeLY,
    });
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setError(null);
  };

  const handleDelete = async (shipCategory: ShipCategory) => {
    if (!shipCategory._id) return;
    if (!confirm(`Delete ship category "${shipCategory.name}"?`)) return;

    setSaving(true);
    try {
      await api.deleteShipCategory(shipCategory._id);
      fetchShipCategories();
    } catch {
      setError("Failed to delete ship category");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      jumpRangeLY: Number(form.jumpRangeLY),
    };

    try {
      if (editTarget?._id) {
        await api.updateShipCategory(editTarget._id, payload);
      } else {
        await api.createShipCategory(payload);
      }
      setForm(EMPTY_FORM);
      setEditTarget(null);
      fetchShipCategories();
    } catch {
      setError(
        editTarget
          ? "Failed to update ship category"
          : "Failed to create ship category",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <Panel>
        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>
            {editTarget ? `Editing: ${editTarget.name}` : "Add Ship Category"}
          </h2>

          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label>Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Jump Freighter"
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Jump Range (LY)</label>
              <input
                type="number"
                step="0.1"
                value={form.jumpRangeLY}
                onChange={(e) =>
                  setForm({ ...form, jumpRangeLY: Number(e.target.value) })
                }
              />
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.formButtons}>
            <Button
              callback={handleSubmit}
              color="green"
              disabled={saving || !form.name}
            >
              {saving
                ? "Saving…"
                : editTarget
                  ? "Save Changes"
                  : "Add Ship Category"}
            </Button>
            {editTarget && (
              <Button callback={handleCancelEdit} color="orange">
                Cancel
              </Button>
            )}
          </div>
        </div>
      </Panel>

      <Panel>
        <div className={styles.tableSection}>
          <h2 className={styles.sectionTitle}>Ship Categories</h2>
          {loading ? (
            <p className={styles.muted}>Loading…</p>
          ) : shipCategories.length === 0 ? (
            <p className={styles.muted}>No ship categories configured.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Jump Range (LY)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {shipCategories.map((shipCategory) => (
                  <tr key={shipCategory._id}>
                    <td>{shipCategory.name}</td>
                    <td>{shipCategory.jumpRangeLY}</td>
                    <td className={styles.actions}>
                      <Button
                        callback={() => handleEdit(shipCategory)}
                        color="orange"
                      >
                        Edit
                      </Button>
                      <Button
                        callback={() => handleDelete(shipCategory)}
                        color="red"
                        disabled={saving}
                      >
                        Delete
                      </Button>
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
