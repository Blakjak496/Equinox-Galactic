"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import IconButton from "@/components/IconButton/IconButton";
import { api, JumpBridgePair } from "@/lib/api";
import styles from "./Ansiblex.module.css";

export default function Ansiblex() {
  const [knownJumpBridges, setKnownJumpBridges] = useState<JumpBridgePair[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchKnownJumpBridges = () => {
    setLoading(true);
    setLoadError(null);
    api
      .getKnownJumpBridges()
      .then(({ data }) => setKnownJumpBridges(data))
      .catch(() => setLoadError("Failed to load known jump bridges"))
      .finally(() => setLoading(false));
  };

  useEffect(fetchKnownJumpBridges, []);

  const [exportingFormat, setExportingFormat] = useState<"rift" | "smt" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async (format: "rift" | "smt") => {
    setExportError(null);
    setExportingFormat(format);
    try {
      await api.downloadJumpBridgeExport(format);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <div className={styles.container}>
      <Panel>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Known Jump Bridges</h2>
          <div className={styles.formButtons}>
            <IconButton
              icon="refresh"
              ariaLabel="Refresh known jump bridges"
              callback={fetchKnownJumpBridges}
              color="blue"
            />
            <Button
              callback={() => handleExport("rift")}
              color="orange"
              disabled={exportingFormat !== null || knownJumpBridges.length === 0}
            >
              {exportingFormat === "rift" ? "Exporting…" : "Export for Rift"}
            </Button>
            <Button
              callback={() => handleExport("smt")}
              color="orange"
              disabled={exportingFormat !== null || knownJumpBridges.length === 0}
            >
              {exportingFormat === "smt" ? "Exporting…" : "Export for SMT"}
            </Button>
          </div>

          {exportError && <p className={styles.error}>{exportError}</p>}
          {loadError && <p className={styles.error}>{loadError}</p>}

          {loading ? (
            <p className={styles.muted}>Loading…</p>
          ) : knownJumpBridges.length === 0 ? (
            <p className={styles.muted}>No jump bridges known yet.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Connection</th>
                </tr>
              </thead>
              <tbody>
                {knownJumpBridges.map((jb) => (
                  <tr key={`${jb.systemAName}|${jb.systemBName}`}>
                    <td>
                      {jb.systemAName} ↔ {jb.systemBName}
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
