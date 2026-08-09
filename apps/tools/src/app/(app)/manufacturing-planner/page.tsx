"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import ItemAutocomplete from "@/components/ItemAutocomplete/ItemAutocomplete";
import BuildTree from "@/components/BuildTree/BuildTree";
import ShoppingList from "@/components/ShoppingList/ShoppingList";
import UnderConstruction from "@/components/UnderConstruction/UnderConstruction";
import { formatIsk, formatNumber } from "@/lib/format";
import {
  api,
  BuildResolveResult,
  BuildStructureOption,
  ItemSearchMatch,
} from "@/lib/api";
import styles from "./ManufacturingPlanner.module.css";

type Tab = "tree" | "list";

export default function ManufacturingPlannerPage() {
  return (
    <UnderConstruction>
      <ManufacturingPlanner />
    </UnderConstruction>
  );
}

function ManufacturingPlanner() {
  const [targetName, setTargetName] = useState("");
  const [targetTypeId, setTargetTypeId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [assumedME, setAssumedME] = useState(10);
  const [buyPriceSource, setBuyPriceSource] = useState<"buy" | "split">("buy");
  const [haulRatePerM3, setHaulRatePerM3] = useState(0);

  const [manufacturingOptions, setManufacturingOptions] = useState<BuildStructureOption[]>([]);
  const [reactionOptions, setReactionOptions] = useState<BuildStructureOption[]>([]);
  const [manufacturingStructureId, setManufacturingStructureId] = useState<number | null>(null);
  const [reactionStructureId, setReactionStructureId] = useState<number | null>(null);

  const [result, setResult] = useState<BuildResolveResult | null>(null);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("tree");

  useEffect(() => {
    api
      .getBuildStructures("manufacturing")
      .then(({ data }) => setManufacturingOptions(data))
      .catch(() => {});
    api
      .getBuildStructures("reaction")
      .then(({ data }) => setReactionOptions(data))
      .catch(() => {});
    api
      .getStructurePreference()
      .then(({ data }) => {
        setManufacturingStructureId(data.manufacturing?.structureId ?? null);
        setReactionStructureId(data.reaction?.structureId ?? null);
      })
      .catch(() => {});
  }, []);

  // Selecting a structure saves it as the default immediately - no separate
  // "save" step, per how this is meant to work (see toolsBuild.ts's PUT
  // /structure-preference).
  const handleStructureChange = (activity: "manufacturing" | "reaction", structureId: number) => {
    if (activity === "manufacturing") setManufacturingStructureId(structureId);
    else setReactionStructureId(structureId);
    api.setStructurePreference(activity, structureId).catch(() => {});
  };

  const handleSelectItem = (item: ItemSearchMatch) => {
    setTargetName(item.name);
    setTargetTypeId(item.typeId);
    setResult(null);
  };

  const handleCalculate = async () => {
    setError(null);
    setResult(null);

    if (!targetTypeId) {
      setError("Search for and select a target item");
      return;
    }
    if (!quantity || quantity <= 0) {
      setError("Enter a valid quantity");
      return;
    }

    setResolving(true);
    try {
      const res = await api.resolveBuild({
        targetItem: targetTypeId,
        quantity,
        assumedME,
        buyPriceSource,
        haulRatePerM3,
      });
      if (!res.ok || !res.data) {
        setError(res.message ?? "Failed to calculate build plan");
        return;
      }
      setResult(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to calculate build plan");
    } finally {
      setResolving(false);
    }
  };

  const manufacturingBonus = manufacturingOptions.find(
    (opt) => opt.structureId === manufacturingStructureId,
  )?.profile;
  const reactionBonus = reactionOptions.find((opt) => opt.structureId === reactionStructureId)?.profile;

  return (
    <div className={styles.container}>
      <Panel>
        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Manufacturing Planner</h2>

          {resolving && (
            <div className={styles.loadingOverlay}>
              <span className={styles.spinner} />
              Calculating…
            </div>
          )}

          <fieldset className={styles.fieldsetReset} disabled={resolving}>
            <div className={styles.formRow}>
              <div className={`${styles.inputGroup} ${styles.inputGroupWide}`}>
                <label>Target Item</label>
                <ItemAutocomplete
                  value={targetName}
                  onChange={(value) => {
                    setTargetName(value);
                    setTargetTypeId(null);
                  }}
                  onSelect={handleSelectItem}
                  placeholder="Item name, e.g. Rorqual"
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Manufacturing ME %</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={assumedME}
                  onChange={(e) => setAssumedME(Number(e.target.value))}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Price Basis</label>
                <select
                  value={buyPriceSource}
                  onChange={(e) => setBuyPriceSource(e.target.value as "buy" | "split")}
                >
                  <option value="buy">Jita Buy</option>
                  <option value="split">Jita Split</option>
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label>Haul Rate (ISK/m³)</label>
                <input
                  type="number"
                  min={0}
                  value={haulRatePerM3}
                  onChange={(e) => setHaulRatePerM3(Number(e.target.value))}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.inputGroup}>
                <label>Manufacturing Structure</label>
                <select
                  value={manufacturingStructureId ?? ""}
                  onChange={(e) => handleStructureChange("manufacturing", Number(e.target.value))}
                >
                  <option value="" disabled>
                    — Select —
                  </option>
                  {manufacturingOptions.map((opt) => (
                    <option key={opt.structureId} value={opt.structureId}>
                      {opt.name ?? opt.structureId} ({opt.systemName ?? "Unknown"})
                    </option>
                  ))}
                </select>
                {manufacturingBonus ? (
                  <span className={styles.bonus}>
                    {manufacturingBonus.structureTypeName ?? "Structure"}
                    {manufacturingBonus.rigTypeIds.length > 0
                      ? ` · Rigs: ${manufacturingBonus.rigNames.join(", ")}`
                      : " · no rigs fitted"}
                  </span>
                ) : (
                  <span className={styles.bonusMissing}>
                    Nothing needing manufacturing will build - it'll price as buy-only.
                  </span>
                )}
              </div>
              <div className={styles.inputGroup}>
                <label>Reaction Structure</label>
                <select
                  value={reactionStructureId ?? ""}
                  onChange={(e) => handleStructureChange("reaction", Number(e.target.value))}
                >
                  <option value="" disabled>
                    — Select —
                  </option>
                  {reactionOptions.map((opt) => (
                    <option key={opt.structureId} value={opt.structureId}>
                      {opt.name ?? opt.structureId} ({opt.systemName ?? "Unknown"})
                    </option>
                  ))}
                </select>
                {reactionBonus ? (
                  <span className={styles.bonus}>
                    {reactionBonus.structureTypeName ?? "Structure"}
                    {reactionBonus.rigTypeIds.length > 0
                      ? ` · Rigs: ${reactionBonus.rigNames.join(", ")}`
                      : " · no rigs fitted"}
                  </span>
                ) : (
                  <span className={styles.bonusMissing}>
                    Nothing needing reactions will build - it'll price as buy-only.
                  </span>
                )}
              </div>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.formButtons}>
              <Button callback={handleCalculate} color="green" disabled={resolving}>
                {resolving ? "Calculating…" : "Calculate"}
              </Button>
            </div>
          </fieldset>
        </div>
      </Panel>

      {result && (
        <>
          <Panel>
            <div className={styles.summaryStrip}>
              <SummaryStat label="Build Cost" value={formatIsk(result.summary.totalBuildCost)} />
              <SummaryStat label="Buy Everything" value={formatIsk(result.summary.totalBuyEverythingCost)} />
              <SummaryStat
                label="ISK Saved"
                value={`${formatIsk(result.summary.iskSaved)} (${result.summary.percentSaved.toFixed(1)}%)`}
              />
              <SummaryStat label="Jobs" value={formatNumber(result.summary.jobCount)} />
              <SummaryStat label="Buy Volume" value={`${formatNumber(result.summary.totalBuyVolumeM3)} m³`} />
            </div>

            {result.warnings.length > 0 && (
              <ul className={styles.warnings}>
                {result.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <div className={styles.tabs}>
              <button
                type="button"
                className={`${styles.tab} ${tab === "tree" ? styles.tabActive : ""}`}
                onClick={() => setTab("tree")}
              >
                Build Tree
              </button>
              <button
                type="button"
                className={`${styles.tab} ${tab === "list" ? styles.tabActive : ""}`}
                onClick={() => setTab("list")}
              >
                Shopping List
              </button>
            </div>

            {tab === "tree" ? <BuildTree root={result.tree} /> : <ShoppingList entries={result.shoppingList} />}
          </Panel>
        </>
      )}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}
