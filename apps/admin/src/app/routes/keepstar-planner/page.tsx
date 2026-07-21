"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import {
  api,
  KeepstarDiscoveryResponse,
  KeepstarRoutePlan,
  KnownKeepstar,
  ShipCategory,
} from "@/lib/api";
import styles from "./KeepstarPlanner.module.css";

export default function KeepstarPlanner() {
  const [searchQuery, setSearchQuery] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [discoveryResult, setDiscoveryResult] =
    useState<KeepstarDiscoveryResponse | null>(null);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  const [knownKeepstars, setKnownKeepstars] = useState<KnownKeepstar[]>([]);
  const [loadingKnown, setLoadingKnown] = useState(true);

  const [shipCategories, setShipCategories] = useState<ShipCategory[]>([]);
  const [shipCategoryId, setShipCategoryId] = useState("");
  const [waypoints, setWaypoints] = useState(["", ""]);
  const [planResult, setPlanResult] = useState<KeepstarRoutePlan | null>(null);
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const fetchKnownKeepstars = () => {
    setLoadingKnown(true);
    api
      .getKnownKeepstars()
      .then(({ data }) => setKnownKeepstars(data))
      .catch(() => {})
      .finally(() => setLoadingKnown(false));
  };

  useEffect(fetchKnownKeepstars, []);

  useEffect(() => {
    api
      .getShipCategories()
      .then(({ data }) => {
        setShipCategories(data);
        if (data.length > 0) setShipCategoryId(data[0]._id ?? "");
      })
      .catch(() => {});
  }, []);

  const handleDiscover = async () => {
    setDiscovering(true);
    setDiscoveryError(null);
    setDiscoveryResult(null);
    try {
      const res = await api.discoverKeepstars(searchQuery);
      if (!res.ok || !res.data) {
        setDiscoveryError(res.message ?? "Discovery failed");
        return;
      }
      setDiscoveryResult(res.data);
      fetchKnownKeepstars();
    } catch (err) {
      setDiscoveryError(
        err instanceof Error ? err.message : "Discovery failed",
      );
    } finally {
      setDiscovering(false);
    }
  };

  const setWaypoint = (index: number, value: string) => {
    const next = [...waypoints];
    next[index] = value;
    setWaypoints(next);
    setPlanResult(null);
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
    setPlanError(null);
    setPlanResult(null);
    setPlanning(true);

    try {
      const ids = waypoints.filter(Boolean);

      if (ids.length < 2) {
        setPlanError("At least 2 waypoints are required");
        return;
      }

      if (!shipCategoryId) {
        setPlanError("Select a ship category");
        return;
      }

      const res = await api.planKeepstarRoute(ids, shipCategoryId);
      if (!res.ok || !res.data) {
        setPlanError(res.message ?? "Failed to plan route");
        return;
      }
      setPlanResult(res.data);
    } catch (err) {
      setPlanError(
        err instanceof Error ? err.message : "Failed to plan route",
      );
    } finally {
      setPlanning(false);
    }
  };

  return (
    <div className={styles.container}>
      <Panel>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Keepstar Discovery</h2>
          <p className={styles.hint}>
            ESI has no endpoint listing every structure you can dock at -
            this searches your connected character&apos;s known structures
            (the same list as your in-game Structure Browser). Try a blank
            query first; if ESI rejects that or returns nothing, retry with
            a substring matching your coalition&apos;s Keepstar naming
            convention.
          </p>

          <div className={styles.discoverRow}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search query (try blank first)"
            />
            <Button
              callback={handleDiscover}
              color="orange"
              disabled={discovering}
            >
              {discovering ? "Searching…" : "Discover"}
            </Button>
          </div>

          {discoveryError && <p className={styles.error}>{discoveryError}</p>}

          {discoveryResult && (
            <>
              <p className={styles.muted}>
                {discoveryResult.totalFound} candidate structure(s) found for
                query &quot;{discoveryResult.searchQuery}&quot;.
              </p>
              {discoveryResult.results.length > 0 && (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Structure ID</th>
                      <th>Outcome</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>System</th>
                      <th>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {discoveryResult.results.map((r) => (
                      <tr
                        key={r.structureId}
                        className={
                          r.outcome === "keepstar" ? styles.rowKeepstar : ""
                        }
                      >
                        <td>{r.structureId}</td>
                        <td>{r.outcome}</td>
                        <td>{r.name ?? "—"}</td>
                        <td>{r.typeName ?? "—"}</td>
                        <td>{r.systemName ?? "—"}</td>
                        <td>{r.detail ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </Panel>

      <Panel>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Known Keepstars</h2>
          <div>
            <Button callback={fetchKnownKeepstars} color="blue">
              Refresh
            </Button>
          </div>

          {loadingKnown ? (
            <p className={styles.muted}>Loading…</p>
          ) : knownKeepstars.length === 0 ? (
            <p className={styles.muted}>
              No Keepstars discovered yet - run a Discover search above.
            </p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>System</th>
                </tr>
              </thead>
              <tbody>
                {knownKeepstars.map((k) => (
                  <tr key={k.structureId}>
                    <td>{k.name ?? "Unknown"}</td>
                    <td>{k.systemName ?? "Unknown"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>

      <Panel>
        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Keepstar Route Planner</h2>

          {planning && (
            <div className={styles.loadingOverlay}>
              <span className={styles.spinner} />
              Plotting route…
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
                    setPlanResult(null);
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
                  <select
                    value={waypoint}
                    onChange={(e) => setWaypoint(index, e.target.value)}
                  >
                    <option value="">Select a known Keepstar…</option>
                    {knownKeepstars.map((k) => (
                      <option
                        key={k.structureId}
                        value={String(k.structureId)}
                      >
                        {k.systemName ?? "Unknown"} – {k.name ?? "Unknown"}
                      </option>
                    ))}
                  </select>
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

            {planError && <p className={styles.error}>{planError}</p>}

            {planResult && (
              <div className={styles.result}>
                <p>
                  {planResult.stops
                    .map((s) => `${s.systemName} – ${s.keepstarName}`)
                    .join(" → ")}
                </p>
                <p>Total distance: {planResult.totalDistanceLY.toFixed(2)} LY</p>
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
