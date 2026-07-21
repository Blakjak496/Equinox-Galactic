"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import SystemAutocomplete from "@/components/SystemAutocomplete/SystemAutocomplete";
import {
  api,
  Route,
  RouteCostOption,
  RouteCostResult,
  ShipCategory,
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
  const [appliedOptionIndex, setAppliedOptionIndex] = useState(0);
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
    setCalcError(null);
    setAppliedOptionIndex(0);
  };

  const applyOption = (option: RouteCostOption, suggestChargeCollateral: boolean) => {
    setForm((prev) => ({
      ...prev,
      rate: Math.round(option.pricePerM3),
      minReward: option.minimum,
      collateralFeePercent: suggestChargeCollateral ? 1 : 0,
    }));
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
      const { data } = await api.calculateRouteCost(
        form.systemA,
        form.systemB,
        shipCategoryId,
      );

      setCalcResult(data);
      setAppliedOptionIndex(0);
      applyOption(data.options[0], data.suggestChargeCollateral);
    } catch (err) {
      setCalcError(
        err instanceof Error ? err.message : "Failed to calculate route cost",
      );
    } finally {
      setCalculating(false);
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

          {(calculating || saving) && (
            <div className={styles.loadingOverlay}>
              <span className={styles.spinner} />
              {calculating ? "Calculating route cost…" : "Saving…"}
            </div>
          )}

          <fieldset
            className={styles.fieldsetReset}
            disabled={calculating || saving}
          >
          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label>System A</label>
              <SystemAutocomplete
                value={form.systemA}
                onChange={(value) => {
                  setForm({ ...form, systemA: value });
                  clearCalculation();
                }}
                placeholder="e.g. Jita"
                disabled={!!editTarget}
              />
            </div>
            <div className={styles.inputGroup}>
              <label>System B</label>
              <SystemAutocomplete
                value={form.systemB}
                onChange={(value) => {
                  setForm({ ...form, systemB: value });
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

          {calcResult && calcResult.options.length === 1 && (
            <div className={styles.calcResult}>
              <p>
                <strong>
                  {calcResult.options[0].mode === "detour" ? "Detour" : "Direct"}
                </strong>
                {calcResult.options[0].mode === "detour" ? (
                  <>
                    {" "}
                    via {calcResult.options[0].detail.mainRouteName} —{" "}
                    {calcResult.options[0].detail.distanceLY?.toFixed(2)} LY
                  </>
                ) : (
                  <>
                    {" "}
                    — round trip{" "}
                    {calcResult.options[0].detail.directRoundTripLY?.toFixed(2)} LY
                  </>
                )}
              </p>
              {calcResult.options[0].mode === "detour" &&
                calcResult.options[0].detail.path && (
                  <>
                    <p>Route:</p>
                    <ol className={styles.routeList}>
                      {calcResult.options[0].detail.path.map((name, index) => (
                        <li key={index}>{name}</li>
                      ))}
                    </ol>
                  </>
                )}
              <p>
                Suggested rate {calcResult.options[0].pricePerM3.toFixed(2)} ISK/m³,
                minimum {calcResult.options[0].minimum.toLocaleString()} ISK
              </p>
              {calcResult.suggestChargeCollateral && (
                <p>Collateral Fee (%) has been set to 1% below.</p>
              )}
              <Button callback={handleCalculate} color="blue" disabled={calculating}>
                Recalculate
              </Button>
            </div>
          )}

          {calcResult && calcResult.options.length > 1 && (
            <div className={styles.calcResult}>
              <p>
                Multiple main routes offer a cheaper detour than a dedicated direct
                trip. Choose which one to apply:
              </p>
              <div className={styles.optionList}>
                {calcResult.options.map((option, index) => (
                  <div
                    key={index}
                    className={
                      index === appliedOptionIndex
                        ? `${styles.optionCard} ${styles.optionCardApplied}`
                        : styles.optionCard
                    }
                  >
                    <p>
                      <strong>
                        {option.mode === "detour" ? "Detour" : "Direct"}
                      </strong>
                      {option.mode === "detour" ? (
                        <>
                          {" "}
                          via {option.detail.mainRouteName} —{" "}
                          {option.detail.distanceLY?.toFixed(2)} LY
                        </>
                      ) : (
                        <>
                          {" "}
                          — round trip {option.detail.directRoundTripLY?.toFixed(2)}{" "}
                          LY
                        </>
                      )}
                    </p>
                    {option.mode === "detour" && option.detail.path && (
                      <>
                        <p>Route:</p>
                        <ol className={styles.routeList}>
                          {option.detail.path.map((name, index) => (
                            <li key={index}>{name}</li>
                          ))}
                        </ol>
                      </>
                    )}
                    <p>
                      Suggested rate {option.pricePerM3.toFixed(2)} ISK/m³, minimum{" "}
                      {option.minimum.toLocaleString()} ISK
                    </p>
                    <Button
                      callback={() => {
                        setAppliedOptionIndex(index);
                        applyOption(option, calcResult.suggestChargeCollateral);
                      }}
                      color={index === appliedOptionIndex ? "green" : "blue"}
                      disabled={calculating}
                    >
                      {index === appliedOptionIndex ? "Applied" : "Use this option"}
                    </Button>
                  </div>
                ))}
              </div>
              {calcResult.suggestChargeCollateral && (
                <p>Collateral Fee (%) has been set to 1% below.</p>
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
          </fieldset>
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
