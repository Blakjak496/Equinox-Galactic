"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import { api } from "@/lib/api";
import styles from "./Settings.module.css";

export default function Settings() {
  const [maxCollateral, setMaxCollateral] = useState<number>(0);
  const [isotopePrice, setIsotopePrice] = useState<number>(0);
  const [salesTaxPercent, setSalesTaxPercent] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api
      .getConfig()
      .then(({ data }) => {
        setMaxCollateral(data.maxCollateral);
        // existing Config docs predate these fields, so they may come back
        // undefined until an admin saves a value here for the first time
        setIsotopePrice(data.isotopePrice ?? 650);
        setSalesTaxPercent((data.salesTaxRate ?? 0.042) * 100);
      })
      .catch(() => setError("Failed to load config"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    setSaving(true);

    try {
      await api.updateConfig({
        maxCollateral,
        isotopePrice,
        salesTaxRate: salesTaxPercent / 100,
      });
      setSaved(true);
    } catch {
      setError("Failed to save config");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <Panel>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Config</h2>

          {loading ? (
            <p className={styles.muted}>Loading…</p>
          ) : (
            <div className={styles.form}>
              <div className={styles.inputGroup}>
                <label>Max Collateral (ISK)</label>
                <input
                  type="number"
                  value={maxCollateral}
                  onChange={(e) => {
                    setMaxCollateral(Number(e.target.value));
                    setSaved(false);
                  }}
                />
                <span className={styles.hint}>
                  {maxCollateral.toLocaleString()} ISK
                </span>
              </div>

              <div className={styles.inputGroup}>
                <label>Isotope Price (ISK)</label>
                <input
                  type="number"
                  value={isotopePrice}
                  onChange={(e) => {
                    setIsotopePrice(Number(e.target.value));
                    setSaved(false);
                  }}
                />
                <span className={styles.hint}>
                  {isotopePrice.toLocaleString()} ISK per isotope
                </span>
              </div>

              <div className={styles.inputGroup}>
                <label>Sales Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={salesTaxPercent}
                  onChange={(e) => {
                    setSalesTaxPercent(Number(e.target.value));
                    setSaved(false);
                  }}
                />
                <span className={styles.hint}>
                  Used only for the buyback margin safety net, not a direct
                  deduction
                </span>
              </div>

              {error && <p className={styles.error}>{error}</p>}
              {saved && <p className={styles.success}>Saved.</p>}

              <Button callback={handleSave} color="green" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
