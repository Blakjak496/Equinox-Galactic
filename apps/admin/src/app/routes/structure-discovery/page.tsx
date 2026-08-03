"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/Panel/Panel";
import Button from "@/components/Button/Button";
import IconButton from "@/components/IconButton/IconButton";
import SystemMap from "@/components/SystemMap/SystemMap";
import SystemAutocomplete from "@/components/SystemAutocomplete/SystemAutocomplete";
import {
  api,
  KeepstarDiscoveryResponse,
  KnownKeepstar,
  JumpBridgeDiscoveryResponse,
  JumpBridgePair,
  JumpBridgeMapResponse,
} from "@/lib/api";
import styles from "./StructureDiscovery.module.css";

export default function StructureDiscovery() {
  const [searchQuery, setSearchQuery] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [discoveryResult, setDiscoveryResult] =
    useState<KeepstarDiscoveryResponse | null>(null);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  const [knownKeepstars, setKnownKeepstars] = useState<KnownKeepstar[]>([]);
  const [loadingKnown, setLoadingKnown] = useState(true);

  const fetchKnownKeepstars = () => {
    setLoadingKnown(true);
    api
      .getKnownKeepstars()
      .then(({ data }) => setKnownKeepstars(data))
      .catch(() => {})
      .finally(() => setLoadingKnown(false));
  };

  useEffect(fetchKnownKeepstars, []);

  const [jbSearchQuery, setJbSearchQuery] = useState("");
  const [jbDiscovering, setJbDiscovering] = useState(false);
  const [jbDiscoveryResult, setJbDiscoveryResult] =
    useState<JumpBridgeDiscoveryResponse | null>(null);
  const [jbDiscoveryError, setJbDiscoveryError] = useState<string | null>(null);

  const [knownJumpBridges, setKnownJumpBridges] = useState<JumpBridgePair[]>([]);
  const [loadingKnownJumpBridges, setLoadingKnownJumpBridges] = useState(true);

  const [jumpBridgeMap, setJumpBridgeMap] = useState<JumpBridgeMapResponse | null>(null);
  const [loadingJumpBridgeMap, setLoadingJumpBridgeMap] = useState(false);
  const [jumpBridgeMapError, setJumpBridgeMapError] = useState<string | null>(null);

  const fetchKnownJumpBridges = () => {
    setLoadingKnownJumpBridges(true);
    api
      .getKnownJumpBridges()
      .then(({ data }) => setKnownJumpBridges(data))
      .catch(() => {})
      .finally(() => setLoadingKnownJumpBridges(false));
  };

  useEffect(fetchKnownJumpBridges, []);

  const handleDiscoverJumpBridges = async () => {
    setJbDiscoveryError(null);
    setJbDiscoveryResult(null);

    if (jbSearchQuery.trim() === "") {
      setJbDiscoveryError(
        "Enter a search term - e.g. \" » \", which by itself matches every Ansiblex jump bridge name.",
      );
      return;
    }

    setJbDiscovering(true);
    try {
      const res = await api.discoverJumpBridges(jbSearchQuery);
      if (!res.ok || !res.data) {
        setJbDiscoveryError(res.message ?? "Discovery failed");
        return;
      }
      setJbDiscoveryResult(res.data);
      fetchKnownJumpBridges();
    } catch (err) {
      setJbDiscoveryError(
        err instanceof Error ? err.message : "Discovery failed",
      );
    } finally {
      setJbDiscovering(false);
    }
  };

  // Some alliances configure their Ansiblexes such that ESI can never
  // resolve them for a character that hasn't docked there - confirmed
  // against a real case, not just a search-visibility gap. There's no ESI
  // fallback for this, so this is a fully manual entry point, same as
  // SMT's own workaround for the identical limitation.
  const [manualStructureId, setManualStructureId] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualHomeSystem, setManualHomeSystem] = useState("");
  const [manualRemoteSystem, setManualRemoteSystem] = useState("");
  const [savingManual, setSavingManual] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSaved, setManualSaved] = useState(false);

  const handleAddManualJumpBridge = async () => {
    setManualError(null);
    setManualSaved(false);

    const structureId = Number(manualStructureId.trim());
    if (!Number.isFinite(structureId) || structureId <= 0) {
      setManualError("Enter a valid structure ID (the number after // in the copied structure link)");
      return;
    }
    if (!manualName.trim() || !manualHomeSystem.trim() || !manualRemoteSystem.trim()) {
      setManualError("Name, home system, and remote system are all required");
      return;
    }

    setSavingManual(true);
    try {
      const res = await api.addManualJumpBridge({
        structureId,
        name: manualName.trim(),
        homeSystemName: manualHomeSystem.trim(),
        remoteSystemName: manualRemoteSystem.trim(),
      });
      if (!res.ok) {
        setManualError(res.message ?? "Failed to save jump bridge");
        return;
      }
      setManualSaved(true);
      setManualStructureId("");
      setManualName("");
      setManualHomeSystem("");
      setManualRemoteSystem("");
      fetchKnownJumpBridges();
    } catch (err) {
      setManualError(err instanceof Error ? err.message : "Failed to save jump bridge");
    } finally {
      setSavingManual(false);
    }
  };

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

  const handleShowJumpBridgeMap = async () => {
    setJumpBridgeMapError(null);
    setLoadingJumpBridgeMap(true);
    try {
      const res = await api.getJumpBridgeMap();
      if (!res.ok) {
        setJumpBridgeMapError("Failed to load jump bridge map");
        return;
      }
      setJumpBridgeMap(res.data);
    } catch (err) {
      setJumpBridgeMapError(
        err instanceof Error ? err.message : "Failed to load jump bridge map",
      );
    } finally {
      setLoadingJumpBridgeMap(false);
    }
  };

  const handleDiscover = async () => {
    setDiscoveryError(null);
    setDiscoveryResult(null);

    if (searchQuery.trim() === "") {
      setDiscoveryError(
        "Enter a search term - confirmed live against ESI, a blank query is rejected outright (400 'search is required'), it doesn't just return everything.",
      );
      return;
    }

    setDiscovering(true);
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

  return (
    <div className={styles.container}>
      <Panel>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Keepstar Discovery</h2>
          <p className={styles.hint}>
            ESI has no endpoint listing every structure you can dock at -
            this searches your connected character&apos;s known structures
            (the same list as your in-game Structure Browser). A search term
            is required - ESI rejects a blank query outright (confirmed
            live) rather than returning everything - so enter a substring
            matching your coalition&apos;s Keepstar naming convention. Run
            it more than once with different substrings to build up the
            full list.
          </p>

          <div className={styles.discoverRow}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search query, e.g. a shared name substring"
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
                Searched as{" "}
                <strong>
                  {discoveryResult.characterName ?? discoveryResult.characterId}
                </strong>{" "}
                - confirm this is the character you assigned as
                &quot;Structure Discovery Character&quot; in Settings if
                results look wrong.
              </p>
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
            <IconButton
              icon="refresh"
              ariaLabel="Refresh known Keepstars"
              callback={fetchKnownKeepstars}
              color="blue"
            />
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
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Jump Bridge Discovery</h2>
          <p className={styles.hint}>
            Same search as Keepstar Discovery above, over the same
            character-scoped structure list. Ansiblex jump bridge names
            follow &quot;SystemA » SystemB - Name&quot;, so &quot;
            »&quot; by itself already matches every jump bridge in one
            search - run it more than once with different substrings only
            if you want to narrow the results.
          </p>

          <div className={styles.discoverRow}>
            <input
              type="text"
              value={jbSearchQuery}
              onChange={(e) => setJbSearchQuery(e.target.value)}
              placeholder="Search query, e.g. » "
            />
            <Button
              callback={handleDiscoverJumpBridges}
              color="orange"
              disabled={jbDiscovering}
            >
              {jbDiscovering ? "Searching…" : "Discover"}
            </Button>
          </div>

          {jbDiscoveryError && <p className={styles.error}>{jbDiscoveryError}</p>}

          {jbDiscoveryResult && (
            <>
              <p className={styles.muted}>
                Searched as{" "}
                <strong>
                  {jbDiscoveryResult.characterName ?? jbDiscoveryResult.characterId}
                </strong>{" "}
                - confirm this is the character you assigned as
                &quot;Structure Discovery Character&quot; in Settings if
                results look wrong.
              </p>
              <p className={styles.muted}>
                {jbDiscoveryResult.totalFound} candidate structure(s) found for
                query &quot;{jbDiscoveryResult.searchQuery}&quot;.
              </p>
              {jbDiscoveryResult.results.length > 0 && (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Structure ID</th>
                      <th>Outcome</th>
                      <th>Name</th>
                      <th>System</th>
                      <th>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jbDiscoveryResult.results.map((r) => (
                      <tr
                        key={r.structureId}
                        className={
                          r.outcome === "jump_bridge" ? styles.rowJumpBridge : ""
                        }
                      >
                        <td>{r.structureId}</td>
                        <td>{r.outcome}</td>
                        <td>{r.name ?? "—"}</td>
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
          <h2 className={styles.sectionTitle}>Add Jump Bridge Manually</h2>
          <p className={styles.hint}>
            Some alliances configure their Ansiblexes so ESI can never
            resolve them for a character that hasn&apos;t docked there -
            having real access (even coalition-wide) isn&apos;t enough, and
            there&apos;s no ESI workaround. In-game, right-click the
            structure and Copy (or drag its Show Info into a chat window) to
            get a link like{" "}
            <code>showinfo:35841//1053334558503</code> - the number after
            the <code>//</code> is the structure ID.
          </p>

          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label>Structure ID</label>
              <input
                type="text"
                value={manualStructureId}
                onChange={(e) => setManualStructureId(e.target.value)}
                placeholder="e.g. 1053334558503"
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Gate Name</label>
              <input
                type="text"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="e.g. Coalition Highway"
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Home System (where the structure is)</label>
              <SystemAutocomplete
                value={manualHomeSystem}
                onChange={setManualHomeSystem}
                placeholder="System name"
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Remote System (the other end)</label>
              <SystemAutocomplete
                value={manualRemoteSystem}
                onChange={setManualRemoteSystem}
                placeholder="System name"
              />
            </div>
          </div>

          {manualError && <p className={styles.error}>{manualError}</p>}
          {manualSaved && <p className={styles.muted}>Saved.</p>}

          <Button
            callback={handleAddManualJumpBridge}
            color="green"
            disabled={savingManual}
          >
            {savingManual ? "Saving…" : "Add Jump Bridge"}
          </Button>
        </div>
      </Panel>

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
              callback={handleShowJumpBridgeMap}
              color="blue"
              disabled={loadingJumpBridgeMap || knownJumpBridges.length === 0}
            >
              {loadingJumpBridgeMap ? "Loading…" : "Show on Map"}
            </Button>
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

          {loadingKnownJumpBridges ? (
            <p className={styles.muted}>Loading…</p>
          ) : knownJumpBridges.length === 0 ? (
            <p className={styles.muted}>
              No jump bridges discovered yet - run a Discover search above.
            </p>
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

          {jumpBridgeMapError && <p className={styles.error}>{jumpBridgeMapError}</p>}

          {jumpBridgeMap && (
            <SystemMap
              bounds={jumpBridgeMap.bounds}
              systems={jumpBridgeMap.systemsInView}
              regions={jumpBridgeMap.regions}
              jumpBridgeConnections={jumpBridgeMap.connections}
            />
          )}
        </div>
      </Panel>
    </div>
  );
}
