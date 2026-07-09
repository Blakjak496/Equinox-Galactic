"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import {
  api,
  Route,
  RouteCostResult,
  ShipCategory,
  SystemLookup,
} from "@/lib/api";
import styles from "./Routes.module.css";

const EMPTY_TERMS = {
  maxVolume: 375000,
  minReward: 0,
  rate: 0,
  rushPrice: 150000000,
  collateralFeePercent: 0,
};

const EMPTY_FORM = {
  systemA: "",
  systemB: "",
  oneWay: false,
  maxVolume: 375000,
  minReward: 0,
  rate: 0,
  rushPrice: 150000000,
  collateralFeePercent: 0,
};

export default function Routes() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<Route | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [calcResult, setCalcResult] = useState<RouteCostResult | null>(null);
  const [pickupSystem, setPickupSystem] = useState<SystemLookup | null>(null);
  const [dropoffSystem, setDropoffSystem] = useState<SystemLookup | null>(
    null,
  );
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [shipCategories, setShipCategories] = useState<ShipCategory[]>([]);
  const [shipCategoryId, setShipCategoryId] = useState("");

  const fetchRoutes = () => {
    api
      .getRoutes()
      .then(({ data }) => setRoutes(data))
      .catch(() => setError("Failed to load routes"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRoutes();
    api
      .getShipCategories()
      .then(({ data }) => {
        setShipCategories(data);
        if (data.length > 0) setShipCategoryId(data[0]._id ?? "");
      })
      .catch(() => {});
  }, []);

  const handleEdit = (route: Route) => {
    setEditTarget(route);
    setForm({
      systemA: route.systems[0],
      systemB: route.systems[1],
      oneWay: route.oneWay,
      ...route.terms,
    });
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setError(null);
    clearCalculation();
  };

  const clearCalculation = () => {
    setCalcResult(null);
    setPickupSystem(null);
    setDropoffSystem(null);
    setCalcError(null);
  };

  const handleCalculate = async () => {
    setCalcError(null);
    setCalculating(true);

    if (!shipCategoryId) {
      setCalcError("Select a ship category");
      setCalculating(false);
      return;
    }

    try {
      const [pickupRes, dropoffRes, calcRes] = await Promise.all([
        api.resolveSystem(form.systemA),
        api.resolveSystem(form.systemB),
        api.calculateRouteCost(form.systemA, form.systemB, shipCategoryId),
      ]);

      setPickupSystem(pickupRes.data);
      setDropoffSystem(dropoffRes.data);
      setCalcResult(calcRes.data);
      setForm((prev) => ({
        ...prev,
        rate: Math.round(calcRes.data.pricePerM3),
        minReward: calcRes.data.minimum,
      }));
    } catch (err) {
      setCalcError(
        err instanceof Error ? err.message : "Failed to calculate route cost",
      );
    } finally {
      setCalculating(false);
    }
  };

  const toggleTetherable = async (which: "pickup" | "dropoff") => {
    const system = which === "pickup" ? pickupSystem : dropoffSystem;
    if (!system) return;

    try {
      const { data } = await api.updateSystemFlag(
        system.systemId,
        !system.hasTetherableStructure,
      );
      if (which === "pickup") setPickupSystem(data);
      else setDropoffSystem(data);
    } catch {
      setCalcError("Failed to update system");
    }
  };

  const handleDelete = async (route: Route) => {
    if (!confirm(`Delete route ${route.systems[0]} ↔ ${route.systems[1]}?`))
      return;
    setSaving(true);
    try {
      await api.deleteRoute(route.systems);
      fetchRoutes();
    } catch {
      setError("Failed to delete route");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSaving(true);

    const payload = {
      systems: [form.systemA.trim(), form.systemB.trim()] as [string, string],
      oneWay: form.oneWay,
      terms: {
        maxVolume: form.maxVolume,
        minReward: form.minReward,
        rate: form.rate,
        rushPrice: form.rushPrice,
        collateralFeePercent: form.collateralFeePercent,
      },
      pricingOverrides: editTarget?.pricingOverrides ?? [],
    };

    try {
      if (editTarget) {
        await api.updateRoute(payload);
      } else {
        await api.createRoute(payload);
      }
      setForm(EMPTY_FORM);
      setEditTarget(null);
      fetchRoutes();
    } catch {
      setError(editTarget ? "Failed to update route" : "Failed to create route");
    } finally {
      setSaving(false);
    }
  };

  const n = (val: string) => Number(val);

  return (
    <div className={styles.container}>
      <Panel>
        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>
            {editTarget
              ? `Editing: ${editTarget.systems[0]} → ${editTarget.systems[1]}`
              : "Add Route"}
          </h2>

          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label>System A</label>
              <input
                value={form.systemA}
                onChange={(e) => {
                  setForm({ ...form, systemA: e.target.value });
                  clearCalculation();
                }}
                placeholder="e.g. Jita"
                disabled={!!editTarget}
              />
            </div>
            <div className={styles.inputGroup}>
              <label>System B</label>
              <input
                value={form.systemB}
                onChange={(e) => {
                  setForm({ ...form, systemB: e.target.value });
                  clearCalculation();
                }}
                placeholder="e.g. BKG-Q2"
                disabled={!!editTarget}
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Ship Category</label>
              <select
                value={shipCategoryId}
                onChange={(e) => {
                  setShipCategoryId(e.target.value);
                  clearCalculation();
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
            <div className={styles.inputGroup}>
              <label>&nbsp;</label>
              <Button
                callback={handleCalculate}
                color="blue"
                disabled={
                  calculating ||
                  !form.systemA ||
                  !form.systemB ||
                  !shipCategoryId
                }
              >
                {calculating ? "Calculating…" : "Calculate Cost"}
              </Button>
            </div>
            <div className={styles.inputGroup}>
              <label>One Way (A → B only)</label>
              <input
                type="checkbox"
                checked={form.oneWay}
                onChange={(e) => setForm({ ...form, oneWay: e.target.checked })}
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Rate (ISK/m³)</label>
              <input
                type="number"
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: n(e.target.value) })}
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Min Reward (ISK)</label>
              <input
                type="number"
                value={form.minReward}
                onChange={(e) =>
                  setForm({ ...form, minReward: n(e.target.value) })
                }
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Rush Price (ISK)</label>
              <input
                type="number"
                value={form.rushPrice}
                onChange={(e) =>
                  setForm({ ...form, rushPrice: n(e.target.value) })
                }
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Max Volume (m³)</label>
              <input
                type="number"
                value={form.maxVolume}
                onChange={(e) =>
                  setForm({ ...form, maxVolume: n(e.target.value) })
                }
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Collateral Fee (%)</label>
              <input
                type="number"
                step="0.1"
                value={form.collateralFeePercent}
                onChange={(e) =>
                  setForm({ ...form, collateralFeePercent: n(e.target.value) })
                }
              />
            </div>
          </div>

          {calcError && <p className={styles.error}>{calcError}</p>}

          {calcResult && (
            <div className={styles.calcResult}>
              <p>
                <strong>{calcResult.mode === "detour" ? "Detour" : "Direct"}</strong>
                {calcResult.mode === "detour" ? (
                  <>
                    {" "}
                    via {calcResult.detail.mainRouteName}, inserted between{" "}
                    {calcResult.detail.insertBetween?.[0]} and{" "}
                    {calcResult.detail.insertBetween?.[1]} (+
                    {calcResult.detail.extraDistanceLY?.toFixed(2)} LY)
                  </>
                ) : (
                  <> — round trip {calcResult.detail.directRoundTripLY?.toFixed(2)} LY</>
                )}
              </p>
              <p>
                Suggested rate {calcResult.pricePerM3.toFixed(2)} ISK/m³, minimum{" "}
                {calcResult.minimum.toLocaleString()} ISK
              </p>
              <label>
                <input
                  type="checkbox"
                  checked={calcResult.suggestChargeCollateral}
                  readOnly
                />
                Suggest charging collateral fee
              </label>
              {pickupSystem && (
                <label>
                  <input
                    type="checkbox"
                    checked={pickupSystem.hasTetherableStructure}
                    onChange={() => toggleTetherable("pickup")}
                  />
                  {pickupSystem.name} has a tetherable structure
                </label>
              )}
              {dropoffSystem && (
                <label>
                  <input
                    type="checkbox"
                    checked={dropoffSystem.hasTetherableStructure}
                    onChange={() => toggleTetherable("dropoff")}
                  />
                  {dropoffSystem.name} has a tetherable structure
                </label>
              )}
              <Button callback={handleCalculate} color="blue" disabled={calculating}>
                Recalculate
              </Button>
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.formButtons}>
            <Button
              callback={handleSubmit}
              color="green"
              disabled={saving || !form.systemA || !form.systemB}
            >
              {saving ? "Saving…" : editTarget ? "Save Changes" : "Add Route"}
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
          <h2 className={styles.sectionTitle}>Routes</h2>
          {loading ? (
            <p className={styles.muted}>Loading…</p>
          ) : routes.length === 0 ? (
            <p className={styles.muted}>No routes configured.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Rate</th>
                  <th>Min Reward</th>
                  <th>Rush Price</th>
                  <th>Max Vol</th>
                  <th>Col %</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {routes.map((r) => (
                  <tr key={r._id ?? r.systems.join("-")}>
                    <td>
                      {r.systems[0]} {r.oneWay ? "→" : "↔"} {r.systems[1]}
                    </td>
                    <td>{r.terms.rate.toLocaleString()}</td>
                    <td>{r.terms.minReward.toLocaleString()}</td>
                    <td>{r.terms.rushPrice.toLocaleString()}</td>
                    <td>{r.terms.maxVolume.toLocaleString()}</td>
                    <td>{r.terms.collateralFeePercent}%</td>
                    <td className={styles.actions}>
                      <Button callback={() => handleEdit(r)} color="orange">
                        Edit
                      </Button>
                      <Button
                        callback={() => handleDelete(r)}
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
