"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import { api, BuybackLocation } from "@/lib/api";
import styles from "./BuybackLocations.module.css";

const EMPTY_FORM = {
  name: "",
  isHub: false,
  distance: 0,
  pickupRatePerM3: "",
};

export default function BuybackLocations() {
  const [locations, setLocations] = useState<BuybackLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<BuybackLocation | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = () => {
    api
      .getBuybackLocations()
      .then(({ data }) => setLocations(data))
      .catch(() => setError("Failed to load buyback locations"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleEdit = (location: BuybackLocation) => {
    setEditTarget(location);
    setForm({
      name: location.name,
      isHub: location.isHub,
      distance: location.distance,
      pickupRatePerM3:
        location.pickupRatePerM3 != null
          ? String(location.pickupRatePerM3)
          : "",
    });
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setError(null);
  };

  const handleDelete = async (location: BuybackLocation) => {
    if (!confirm(`Delete location "${location.name}"?`)) return;

    setSaving(true);
    try {
      await api.deleteBuybackLocation(location._id);
      fetchLocations();
    } catch {
      setError("Failed to delete buyback location");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      isHub: form.isHub,
      distance: Number(form.distance),
      pickupRatePerM3:
        form.pickupRatePerM3.trim() === ""
          ? null
          : Number(form.pickupRatePerM3),
    };

    try {
      if (editTarget?._id) {
        await api.updateBuybackLocation(editTarget._id, payload);
      } else {
        await api.createBuybackLocation(payload);
      }
      setForm(EMPTY_FORM);
      setEditTarget(null);
      fetchLocations();
    } catch {
      setError(
        editTarget
          ? "Failed to update buyback location"
          : "Failed to create buyback location",
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
            {editTarget ? `Editing: ${editTarget.name}` : "Add Location"}
          </h2>

          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label>Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Jita IV - Moon 4"
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Distance</label>
              <input
                type="number"
                step="0.01"
                value={form.distance}
                onChange={(e) =>
                  setForm({ ...form, distance: Number(e.target.value) })
                }
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Pickup Rate (ISK/m³)</label>
              <input
                type="number"
                step="0.01"
                value={form.pickupRatePerM3}
                onChange={(e) =>
                  setForm({ ...form, pickupRatePerM3: e.target.value })
                }
                placeholder="Leave blank for no pickup service"
              />
            </div>
            <div className={styles.checkboxGroup}>
              <label>
                <input
                  type="checkbox"
                  checked={form.isHub}
                  onChange={(e) =>
                    setForm({ ...form, isHub: e.target.checked })
                  }
                />
                Trade hub
              </label>
            </div>
          </div>

          <p className={styles.hint}>
            Pickup Rate is charged per m³ of fee-eligible volume to collect a
            contract from this location and bring it back to the hub. Only
            set it for satellite locations with a pickup service - leave it
            blank for hubs or locations you don&apos;t offer pickup from.
          </p>

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
                  : "Add Location"}
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
          <h2 className={styles.sectionTitle}>Locations</h2>
          {loading ? (
            <p className={styles.muted}>Loading…</p>
          ) : locations.length === 0 ? (
            <p className={styles.muted}>No locations configured.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Hub</th>
                  <th>Distance</th>
                  <th>Pickup Rate (ISK/m³)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {locations.map((location) => (
                  <tr key={location._id}>
                    <td>{location.name}</td>
                    <td>{location.isHub ? "Yes" : "No"}</td>
                    <td>{location.distance}</td>
                    <td>{location.pickupRatePerM3 ?? "—"}</td>
                    <td className={styles.actions}>
                      <Button
                        callback={() => handleEdit(location)}
                        color="orange"
                      >
                        Edit
                      </Button>
                      <Button
                        callback={() => handleDelete(location)}
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
