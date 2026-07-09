"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import { api, MainRoute } from "@/lib/api";
import styles from "./MainRoutes.module.css";

const EMPTY_FORM = {
  name: "",
  active: true,
  waypoints: ["", ""],
};

export default function MainRoutes() {
  const [mainRoutes, setMainRoutes] = useState<MainRoute[]>([]);
  const [systemNames, setSystemNames] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<MainRoute | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMainRoutes = () => {
    api
      .getMainRoutes()
      .then(({ data }) => setMainRoutes(data))
      .catch(() => setError("Failed to load main routes"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMainRoutes();
  }, []);

  useEffect(() => {
    const missingIds = new Set<number>();
    for (const route of mainRoutes) {
      for (const systemId of route.waypoints) {
        if (!(systemId in systemNames)) missingIds.add(systemId);
      }
    }

    if (missingIds.size === 0) return;

    Promise.all(
      Array.from(missingIds).map((systemId) =>
        api
          .getSystem(systemId)
          .then(({ data }) => [systemId, data.name] as const)
          .catch(() => [systemId, `#${systemId}`] as const),
      ),
    ).then((pairs) => {
      setSystemNames((prev) => ({ ...prev, ...Object.fromEntries(pairs) }));
    });
  }, [mainRoutes, systemNames]);

  const handleEdit = (route: MainRoute) => {
    setEditTarget(route);
    setForm({
      name: route.name,
      active: route.active,
      waypoints: route.waypoints.map(
        (systemId) => systemNames[systemId] ?? String(systemId),
      ),
    });
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setError(null);
  };

  const handleDelete = async (route: MainRoute) => {
    if (!route._id) return;
    if (!confirm(`Delete main route "${route.name}"?`)) return;

    setSaving(true);
    try {
      await api.deleteMainRoute(route._id);
      fetchMainRoutes();
    } catch {
      setError("Failed to delete main route");
    } finally {
      setSaving(false);
    }
  };

  const setWaypoint = (index: number, value: string) => {
    const waypoints = [...form.waypoints];
    waypoints[index] = value;
    setForm({ ...form, waypoints });
  };

  const addWaypoint = () => {
    setForm({ ...form, waypoints: [...form.waypoints, ""] });
  };

  const removeWaypoint = (index: number) => {
    setForm({
      ...form,
      waypoints: form.waypoints.filter((_, i) => i !== index),
    });
  };

  const moveWaypoint = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= form.waypoints.length) return;

    const waypoints = [...form.waypoints];
    [waypoints[index], waypoints[target]] = [
      waypoints[target],
      waypoints[index],
    ];
    setForm({ ...form, waypoints });
  };

  const handleSubmit = async () => {
    setError(null);
    setSaving(true);

    try {
      const names = form.waypoints.map((name) => name.trim()).filter(Boolean);

      if (names.length < 2) {
        setError("At least 2 waypoints are required");
        setSaving(false);
        return;
      }

      const resolved = await Promise.all(
        names.map((name) => api.resolveSystem(name)),
      );

      const waypoints = resolved.map((r) => r.data.systemId);
      const nameCache = Object.fromEntries(
        resolved.map((r) => [r.data.systemId, r.data.name]),
      );
      setSystemNames((prev) => ({ ...prev, ...nameCache }));

      const payload = {
        name: form.name.trim(),
        active: form.active,
        waypoints,
      };

      if (editTarget?._id) {
        await api.updateMainRoute(editTarget._id, payload);
      } else {
        await api.createMainRoute(payload);
      }

      setForm(EMPTY_FORM);
      setEditTarget(null);
      fetchMainRoutes();
    } catch {
      setError(
        editTarget
          ? "Failed to update main route — check every waypoint name resolves to a real system"
          : "Failed to create main route — check every waypoint name resolves to a real system",
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
            {editTarget ? `Editing: ${editTarget.name}` : "Add Main Route"}
          </h2>

          <div className={styles.formRow}>
            <div className={styles.inputGroup}>
              <label>Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. BKG-Q2 to Jita"
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Active</label>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  setForm({ ...form, active: e.target.checked })
                }
              />
            </div>
          </div>

          <div className={styles.waypointList}>
            {form.waypoints.map((waypoint, index) => (
              <div key={index} className={styles.waypointRow}>
                <span className={styles.waypointIndex}>{index + 1}</span>
                <input
                  type="text"
                  value={waypoint}
                  onChange={(e) => setWaypoint(index, e.target.value)}
                  placeholder="System name, e.g. Jita"
                />
                <Button
                  callback={() => moveWaypoint(index, -1)}
                  color="blue"
                  disabled={index === 0}
                >
                  ↑
                </Button>
                <Button
                  callback={() => moveWaypoint(index, 1)}
                  color="blue"
                  disabled={index === form.waypoints.length - 1}
                >
                  ↓
                </Button>
                <Button
                  callback={() => removeWaypoint(index)}
                  color="red"
                  disabled={form.waypoints.length <= 2}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <div className={styles.formButtons}>
            <Button callback={addWaypoint} color="blue">
              Add Waypoint
            </Button>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.formButtons}>
            <Button
              callback={handleSubmit}
              color="green"
              disabled={saving || !form.name}
            >
              {saving ? "Saving…" : editTarget ? "Save Changes" : "Add Main Route"}
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
          <h2 className={styles.sectionTitle}>Main Routes</h2>
          {loading ? (
            <p className={styles.muted}>Loading…</p>
          ) : mainRoutes.length === 0 ? (
            <p className={styles.muted}>No main routes configured.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Waypoints</th>
                  <th>Active</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {mainRoutes.map((route) => (
                  <tr key={route._id}>
                    <td>{route.name}</td>
                    <td>
                      {route.waypoints
                        .map((systemId) => systemNames[systemId] ?? `#${systemId}`)
                        .join(" → ")}
                    </td>
                    <td>{route.active ? "Yes" : "No"}</td>
                    <td className={styles.actions}>
                      <Button callback={() => handleEdit(route)} color="orange">
                        Edit
                      </Button>
                      <Button
                        callback={() => handleDelete(route)}
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
