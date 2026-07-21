"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import SystemAutocomplete from "@/components/SystemAutocomplete/SystemAutocomplete";
import { api, JumpRoutePlan, ShipCategory } from "@/lib/api";
import styles from "./JumpPlanner.module.css";

export default function JumpPlanner() {
  const [shipCategories, setShipCategories] = useState<ShipCategory[]>([]);
  const [shipCategoryId, setShipCategoryId] = useState("");
  const [waypoints, setWaypoints] = useState(["", ""]);
  const [result, setResult] = useState<JumpRoutePlan | null>(null);
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getShipCategories()
      .then(({ data }) => {
        setShipCategories(data);
        if (data.length > 0) setShipCategoryId(data[0]._id ?? "");
      })
      .catch(() => setError("Failed to load ship categories"));
  }, []);

  const setWaypoint = (index: number, value: string) => {
    const next = [...waypoints];
    next[index] = value;
    setWaypoints(next);
    setResult(null);
  };

  const addWaypoint = () => setWaypoints([...waypoints, ""]);

  const removeWaypoint = (index: number) =>
    setWaypoints(waypoints.filter((_, i) => i !== index));

  const moveWaypoint = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= waypoints.length) return;

    const next = [...waypoints];
    [next[index], next[target]] = [next[target], next[index]];
    setWaypoints(next);
  };

  const handlePlan = async () => {
    setError(null);
    setResult(null);
    setPlanning(true);

    try {
      const names = waypoints.map((name) => name.trim()).filter(Boolean);

      if (names.length < 2) {
        setError("At least 2 waypoints are required");
        setPlanning(false);
        return;
      }

      if (!shipCategoryId) {
        setError("Select a ship category");
        setPlanning(false);
        return;
      }

      const { data } = await api.planJumpRoute(names, shipCategoryId);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to plan jump route");
    } finally {
      setPlanning(false);
    }
  };

  return (
    <div className={styles.container}>
      <Panel>
        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Jump Route Planner</h2>

          {planning && (
            <div className={styles.loadingOverlay}>
              <span className={styles.spinner} />
              Plotting jump route…
            </div>
          )}

          <fieldset className={styles.fieldsetReset} disabled={planning}>
          <div className={styles.formRow}>
            <div className={styles.inputGroup}>
              <label>Ship Category</label>
              <select
                value={shipCategoryId}
                onChange={(e) => {
                  setShipCategoryId(e.target.value);
                  setResult(null);
                }}
              >
                {shipCategories.length === 0 && <option value="">—</option>}
                {shipCategories.map((sc) => (
                  <option key={sc._id} value={sc._id}>
                    {sc.name} ({sc.jumpRangeLY} LY)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.waypointList}>
            {waypoints.map((waypoint, index) => (
              <div key={index} className={styles.waypointRow}>
                <span className={styles.waypointIndex}>{index + 1}</span>
                <SystemAutocomplete
                  value={waypoint}
                  onChange={(value) => setWaypoint(index, value)}
                  placeholder="System name, e.g. Jita"
                />
                <div className={styles.waypointBtn}>
                  <Button
                    callback={() => moveWaypoint(index, -1)}
                    color="blue"
                    disabled={index === 0}
                  >
                    ↑
                  </Button>
                </div>
                <div className={styles.waypointBtn}>
                  <Button
                    callback={() => moveWaypoint(index, 1)}
                    color="blue"
                    disabled={index === waypoints.length - 1}
                  >
                    ↓
                  </Button>
                </div>
                <div className={styles.waypointBtn}>
                  <Button
                    callback={() => removeWaypoint(index)}
                    color="red"
                    disabled={waypoints.length <= 2}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.formButtons}>
            <Button callback={addWaypoint} color="blue">
              Add Waypoint
            </Button>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          {result && (
            <div className={styles.result}>
              <ol className={styles.routeList}>
                {result.path.map((name, index) => (
                  <li key={index}>{name}</li>
                ))}
              </ol>
              <p>Total distance: {result.totalDistanceLY.toFixed(2)} LY</p>
            </div>
          )}

          <div className={styles.formButtons}>
            <Button callback={handlePlan} color="green" disabled={planning}>
              {planning ? "Planning…" : "Plan Route"}
            </Button>
          </div>
          </fieldset>
        </div>
      </Panel>
    </div>
  );
}
