"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  documentId,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { app } from "@/firebase";
import styles from "./Runs.module.css";

type ValidationLevel = "ok" | "warning" | "fail";

type Structure = {
  structureId: string;
  access: "ok" | "forbidden";
  name: string | null;
  solarSystemId: number | null;
  solarSystemName: string | null;
  typeId: number | null;
  typeName: string | null;
};

type Contract = {
  contractId: string;
  status: string;

  title: string | null;
  quoteId: string | null;

  volume: number | null;
  reward: number | null;

  startLocationId: number | null;
  endLocationId: number | null;

  pickupStructure: Structure;
  dropoffStructure: Structure;

  validationLevel: ValidationLevel;
  validationReasons: string[];

  adminValidated: boolean;
  adminDecision: "none" | "approved" | "rejected";
};

type RunStatus = "planned" | "in_progress" | "completed" | "cancelled";

type RunDoc = {
  status: RunStatus;
  contractIds: string[];

  createdAt: unknown;
  startedAt: unknown | null;
  completedAt: unknown | null;

  fuelUsed: number | null;
  fuelCostPerUnit: number | null;
  fuelCostTotal: number | null;

  totalReward: number | null;
  totalVolume: number | null;
  profit: number | null;

  notes: string | null;
  lastUpdatedAt: unknown;
};

type RunRow = { id: string; run: RunDoc };

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

function safeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeValidationLevel(raw: unknown): ValidationLevel {
  if (raw === "fail" || raw === "warning" || raw === "ok") return raw;
  return "ok";
}

function shortReason(reason: string) {
  // Keep these short and readable. Expand later if you want.
  switch (reason) {
    case "STRUCTURE_FORBIDDEN_PICKUP":
      return "No dock (pickup)";
    case "STRUCTURE_FORBIDDEN_DROPOFF":
      return "No dock (dropoff)";
    case "QUOTE_NOT_FOUND":
      return "No quote";
    case "ROUTE_MISMATCH":
      return "Route";
    case "ROUTE_UNSUPPORTED":
      return "Route unsupported";
    case "VOLUME_MISMATCH":
      return "Volume";
    case "COLLATERAL_MISMATCH":
      return "Collateral";
    case "REWARD_MISMATCH":
      return "Reward";
    default:
      return reason.replaceAll("_", " ").toLowerCase();
  }
}

function toIdSet(ids: unknown): Set<string> {
  if (!Array.isArray(ids)) return new Set();
  return new Set(ids.map(String));
}

function setToArray(set: Set<string>): string[] {
  return Array.from(set);
}

export default function Runs() {
  const db = getFirestore(app);

  const [loadingContracts, setLoadingContracts] = useState(true);
  const [loadingRuns, setLoadingRuns] = useState(true);

  const [outstandingContracts, setOutstandingContracts] = useState<Contract[]>(
    [],
  );
  const [activeRuns, setActiveRuns] = useState<RunRow[]>([]);

  const [contractToRunId, setContractToRunId] = useState<
    Record<string, string>
  >({});

  const [selectedContractIds, setSelectedContractIds] = useState<Set<string>>(
    new Set(),
  );
  const [isCreatingRun, setIsCreatingRun] = useState(false);

  const [contractsById, setContractsById] = useState<Record<string, Contract>>(
    {},
  );

  const [runBeingCompletedId, setRunBeingCompletedId] = useState<string | null>(
    null,
  );
  const [completionFuelUsed, setCompletionFuelUsed] = useState<number>(0);
  const [completionFuelCostPerUnit, setCompletionFuelCostPerUnit] =
    useState<number>(0);
  const [completionNotes, setCompletionNotes] = useState<string>("");
  const [editingRunId, setEditingRunId] = useState<string | null>(null);
  const [draftContractIds, setDraftContractIds] = useState<Set<string>>(
    new Set(),
  );
  const [isSavingRunEdits, setIsSavingRunEdits] = useState(false);

  // Subscribe: planned + in-progress runs (also builds contract -> run map)
  useEffect(() => {
    const runsQuery = query(
      collection(db, "runs"),
      where("status", "in", ["planned", "in_progress"]),
    );

    const unsubscribe = onSnapshot(
      runsQuery,
      (snapshot) => {
        const nextRuns: RunRow[] = [];
        const nextContractToRun: Record<string, string> = {};

        snapshot.forEach((runDocSnap) => {
          const run = runDocSnap.data() as RunDoc;
          const runId = runDocSnap.id;
          const contractIds = (run.contractIds ?? []).map(String);

          contractIds.forEach((contractId) => {
            nextContractToRun[contractId] = runId;
          });

          nextRuns.push({ id: runId, run });
        });

        nextRuns.sort(
          (a, b) =>
            (b.run.contractIds?.length ?? 0) - (a.run.contractIds?.length ?? 0),
        );

        setActiveRuns(nextRuns);
        setContractToRunId(nextContractToRun);
        setLoadingRuns(false);
      },
      (error) => {
        console.error("Runs subscription error:", error);
        setLoadingRuns(false);
      },
    );

    return () => unsubscribe();
  }, [db]);

  // Subscribe: outstanding contracts
  useEffect(() => {
    const contractsQuery = query(
      collection(db, "contracts"),
      where("status", "==", "outstanding"),
    );

    const unsubscribe = onSnapshot(
      contractsQuery,
      (snapshot) => {
        const nextContracts: Contract[] = [];

        snapshot.forEach((contractDoc) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const raw = contractDoc.data() as any;
          const contractId = String(raw.contractId ?? contractDoc.id);
          const quoteId =
            typeof raw.quoteId === "string" && raw.quoteId.trim()
              ? raw.quoteId.trim()
              : null;

          const validation = raw.validation ?? {};
          const manual = raw.manual ?? {};

          nextContracts.push({
            contractId,
            quoteId,
            status: String(raw.status),

            title:
              typeof raw.title === "string" && raw.title.trim()
                ? raw.title.trim()
                : null,

            volume: raw.volume ?? null,
            reward: raw.reward ?? null,
            startLocationId: raw.startLocationId ?? null,
            endLocationId: raw.endLocationId ?? null,
            pickupStructure: raw.pickupStructure ?? null,
            dropoffStructure: raw.dropoffStructure ?? null,

            validationLevel: normalizeValidationLevel(validation.level),
            validationReasons: Array.isArray(validation.reasons)
              ? validation.reasons.map(String)
              : [],

            adminValidated: Boolean(manual.validated),
            adminDecision:
              manual.decision === "approved" || manual.decision === "rejected"
                ? manual.decision
                : "none",
          });
        });

        nextContracts.sort(
          (a, b) => safeNumber(b.volume) - safeNumber(a.volume),
        );

        setOutstandingContracts(nextContracts);
        setLoadingContracts(false);
      },
      (error) => {
        console.error("Contracts subscription error:", error);
        setLoadingContracts(false);
      },
    );

    return () => unsubscribe();
  }, [db]);

  // Keep selection valid when lists change
  useEffect(() => {
    setSelectedContractIds((current) => {
      if (current.size === 0) return current;

      const outstandingById = new Set(
        outstandingContracts.map((c) => c.contractId),
      );
      let changed = false;

      const next = new Set<string>();
      current.forEach((id) => {
        const stillOutstanding = outstandingById.has(id);
        const notInAnyRun = !contractToRunId[id];
        if (stillOutstanding && notInAnyRun) next.add(id);
        else changed = true;
      });

      return changed ? next : current;
    });
  }, [outstandingContracts, contractToRunId]);

  const availableOutstandingContracts = useMemo(() => {
    return outstandingContracts.filter(
      (contract) => !contractToRunId[contract.contractId],
    );
  }, [outstandingContracts, contractToRunId]);

  // Fetch contract docs referenced by active runs (for totals + display)
  useEffect(() => {
    (async () => {
      const runContractIds = Array.from(
        new Set(
          activeRuns.flatMap((row) => row.run.contractIds ?? []).map(String),
        ),
      );

      if (runContractIds.length === 0) {
        setContractsById({});
        return;
      }

      const nextMap: Record<string, Contract> = { ...contractsById };
      const missingIds = runContractIds.filter((id) => !nextMap[id]);

      if (missingIds.length === 0) return;

      try {
        const idGroups = chunkArray(missingIds, 10);

        for (const group of idGroups) {
          const contractsQuery = query(
            collection(db, "contracts"),
            where(documentId(), "in", group),
          );

          const snapshot = await getDocs(contractsQuery);

          snapshot.forEach((contractDoc) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const raw = contractDoc.data() as any;
            const contractId = String(raw.contractId ?? contractDoc.id);
            const quoteId =
              typeof raw.quoteId === "string" && raw.quoteId.trim()
                ? raw.quoteId.trim()
                : null;

            const validation = raw.validation ?? {};
            const manual = raw.manual ?? {};

            nextMap[contractId] = {
              contractId,
              quoteId,
              status: String(raw.status),

              title:
                typeof raw.title === "string" && raw.title.trim()
                  ? raw.title.trim()
                  : null,

              volume: raw.volume ?? null,
              reward: raw.reward ?? null,
              startLocationId: raw.startLocationId ?? null,
              endLocationId: raw.endLocationId ?? null,
              pickupStructure: raw.pickupStructure ?? null,
              dropoffStructure: raw.dropoffStructure ?? null,

              validationLevel: normalizeValidationLevel(validation.level),
              validationReasons: Array.isArray(validation.reasons)
                ? validation.reasons.map(String)
                : [],

              adminValidated: Boolean(manual.validated),
              adminDecision:
                manual.decision === "approved" || manual.decision === "rejected"
                  ? manual.decision
                  : "none",
            };
          });
        }

        setContractsById(nextMap);
      } catch (error) {
        console.error("Failed to fetch contracts for runs:", error);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
  }, [activeRuns, db]);

  const stats = useMemo(() => {
    const reserved = Object.keys(contractToRunId).length;
    return {
      outstanding: outstandingContracts.length,
      available: availableOutstandingContracts.length,
      reserved,
    };
  }, [outstandingContracts, availableOutstandingContracts, contractToRunId]);

  function isContractBlocked(contract: Contract) {
    if (contract.adminDecision === "rejected") return true;
    if (contract.validationLevel === "fail") return true;
    if (contract.validationLevel === "warning" && !contract.adminValidated)
      return true;
    return false;
  }

  function contractRowClass(contract: Contract) {
    if (contract.adminDecision === "rejected")
      return `${styles.row} ${styles.rowFail}`;
    if (contract.validationLevel === "fail")
      return `${styles.row} ${styles.rowFail}`;
    if (contract.validationLevel === "warning" && !contract.adminValidated)
      return `${styles.row} ${styles.rowWarning}`;
    return styles.row;
  }

  const toggleContractSelection = (contract: Contract) => {
    if (isContractBlocked(contract)) return;

    setSelectedContractIds((current) => {
      const next = new Set(current);
      if (next.has(contract.contractId)) next.delete(contract.contractId);
      else next.add(contract.contractId);
      return next;
    });
  };

  const clearSelection = () => setSelectedContractIds(new Set());

  const calculateTotalsFromContracts = (
    contractIds: string[],
    map: Record<string, Contract>,
  ) => {
    let totalReward = 0;
    let totalVolume = 0;

    for (const id of contractIds) {
      const contract = map[id];
      if (!contract) continue;
      totalReward += safeNumber(contract.reward);
      totalVolume += safeNumber(contract.volume);
    }

    return { totalReward, totalVolume };
  };

  const createPlannedRun = async () => {
    const contractIds = Array.from(selectedContractIds);
    if (contractIds.length === 0) return;

    for (const id of contractIds) {
      if (contractToRunId[id]) {
        alert("One or more selected contracts are already in an active run.");
        return;
      }
    }

    const selectedContractsMap: Record<string, Contract> = {};
    for (const contract of availableOutstandingContracts) {
      selectedContractsMap[contract.contractId] = contract;
    }

    const totals = calculateTotalsFromContracts(
      contractIds,
      selectedContractsMap,
    );

    setIsCreatingRun(true);
    try {
      const newRun: RunDoc = {
        status: "planned",
        contractIds,

        createdAt: serverTimestamp(),
        startedAt: null,
        completedAt: null,

        fuelUsed: null,
        fuelCostPerUnit: null,
        fuelCostTotal: null,

        totalReward: totals.totalReward,
        totalVolume: totals.totalVolume,
        profit: null,

        notes: null,
        lastUpdatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "runs"), newRun);
      clearSelection();
    } catch (error) {
      console.error("Failed to create run:", error);
      alert("Failed to create run.");
    } finally {
      setIsCreatingRun(false);
    }
  };

  const markRunInProgress = async (runId: string) => {
    try {
      await updateDoc(doc(db, "runs", runId), {
        status: "in_progress",
        startedAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to mark run in progress:", error);
      alert("Failed to update run.");
    }
  };

  const openCompletionPanel = (runId: string) => {
    setRunBeingCompletedId(runId);
    setCompletionFuelUsed(0);
    setCompletionFuelCostPerUnit(0);
    setCompletionNotes("");
  };

  const closeCompletionPanel = () => {
    setRunBeingCompletedId(null);
  };

  const calculateRunTotals = (runRow: RunRow) => {
    const contractIds = (runRow.run.contractIds ?? []).map(String);
    return calculateTotalsFromContracts(contractIds, contractsById);
  };

  const confirmCompleteRun = async () => {
    if (!runBeingCompletedId) return;

    const runRow = activeRuns.find((row) => row.id === runBeingCompletedId);
    if (!runRow) return;

    const { totalReward, totalVolume } = calculateRunTotals(runRow);

    const used = Number(completionFuelUsed);
    const costPerUnit = Number(completionFuelCostPerUnit);

    if (!Number.isFinite(used) || used < 0) {
      alert("Fuel used must be 0 or more.");
      return;
    }
    if (!Number.isFinite(costPerUnit) || costPerUnit < 0) {
      alert("Fuel cost per unit must be 0 or more.");
      return;
    }

    const fuelCostTotal = used * costPerUnit;
    const profit = totalReward - fuelCostTotal;

    try {
      await updateDoc(doc(db, "runs", runBeingCompletedId), {
        status: "completed",
        completedAt: serverTimestamp(),

        fuelUsed: used,
        fuelCostPerUnit: costPerUnit,
        fuelCostTotal,

        totalReward,
        totalVolume,
        profit,

        notes: completionNotes.trim() ? completionNotes.trim() : null,
        lastUpdatedAt: serverTimestamp(),
      });

      closeCompletionPanel();
    } catch (error) {
      console.error("Failed to complete run:", error);
      alert("Failed to complete run.");
    }
  };

  const setContractValidated = async (
    contractId: string,
    validated: boolean,
  ) => {
    try {
      await updateDoc(doc(db, "contracts", contractId), {
        "manual.validated": validated,
        "manual.validatedAt": serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to update validation:", error);
      alert("Failed to update contract.");
    }
  };

  const setContractDecision = async (
    contractId: string,
    decision: "none" | "approved" | "rejected",
  ) => {
    try {
      await updateDoc(doc(db, "contracts", contractId), {
        "manual.decision": decision,
        "manual.decisionAt": serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to update decision:", error);
      alert("Failed to update contract.");
    }
  };

  const isLoading = loadingContracts || loadingRuns;

  if (isLoading) {
    return <div className={styles.loading}>Loading runs…</div>;
  }

  const beginEditRun = (runRow: RunRow) => {
    if (runRow.run.status !== "planned") return;
    setEditingRunId(runRow.id);
    setDraftContractIds(toIdSet(runRow.run.contractIds));
  };

  const cancelEditRun = () => {
    setEditingRunId(null);
    setDraftContractIds(new Set());
  };

  const toggleDraftContract = (contractId: string) => {
    setDraftContractIds((current) => {
      const next = new Set(current);
      if (next.has(contractId)) next.delete(contractId);
      else next.add(contractId);
      return next;
    });
  };

  const confirmEditRun = async () => {
    if (!editingRunId) return;

    const runRow = activeRuns.find((row) => row.id === editingRunId);
    if (!runRow) return;

    if (runRow.run.status !== "planned") {
      alert("Only planned runs can be edited.");
      cancelEditRun();
      return;
    }

    const contractIds = setToArray(draftContractIds);

    if (contractIds.length === 0) {
      alert("A run must contain at least 1 contract.");
      return;
    }

    // Prevent stealing contracts reserved by other runs
    // Prevent stealing contracts already assigned to another run
    const runContractIds = new Set((runRow.run.contractIds ?? []).map(String));

    for (const contractId of contractIds) {
      const assignedRunId = contractToRunId[contractId];

      const assignedToAnotherRun =
        typeof assignedRunId === "string" &&
        assignedRunId.length > 0 &&
        assignedRunId !== runRow.id;

      if (assignedToAnotherRun && !runContractIds.has(contractId)) {
        alert(
          "One or more selected contracts are already in another active run.",
        );
        return;
      }
    }

    const totalRewardAndVolume = (() => {
      let totalReward = 0;
      let totalVolume = 0;

      for (const id of contractIds) {
        const contract = contractsById[id];
        if (!contract) continue;
        totalReward += safeNumber(contract.reward);
        totalVolume += safeNumber(contract.volume);
      }

      return { totalReward, totalVolume };
    })();

    setIsSavingRunEdits(true);
    try {
      await updateDoc(doc(db, "runs", editingRunId), {
        contractIds,
        totalReward: totalRewardAndVolume.totalReward,
        totalVolume: totalRewardAndVolume.totalVolume,
        lastUpdatedAt: serverTimestamp(),
      });

      cancelEditRun();
    } catch (error) {
      console.error("Failed to save run edits:", error);
      alert("Failed to save changes.");
    } finally {
      setIsSavingRunEdits(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Runs</h2>
          <div className={styles.meta}>
            Outstanding: <b>{stats.outstanding}</b> · Available:{" "}
            <b>{stats.available}</b> · Reserved: <b>{stats.reserved}</b>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            onClick={createPlannedRun}
            disabled={selectedContractIds.size === 0 || isCreatingRun}
            className={styles.primaryButton}
          >
            {isCreatingRun
              ? "Creating…"
              : `Create run (${selectedContractIds.size})`}
          </button>

          <button
            onClick={clearSelection}
            disabled={selectedContractIds.size === 0 || isCreatingRun}
            className={styles.secondaryButton}
          >
            Clear
          </button>
        </div>
      </header>

      <section className={styles.section}>
        <h3 className={styles.subtitle}>Available outstanding contracts</h3>

        <div className={styles.list}>
          {availableOutstandingContracts.map((contract) => {
            const blocked = isContractBlocked(contract);
            const titleText =
              contract.quoteId ?? contract.title ?? contract.contractId;

            return (
              <div
                key={contract.contractId}
                className={contractRowClass(contract)}
              >
                <input
                  type="checkbox"
                  checked={selectedContractIds.has(contract.contractId)}
                  disabled={blocked}
                  onChange={() => toggleContractSelection(contract)}
                />

                <div className={styles.rowBody}>
                  <div className={styles.rowTitle}>{titleText}</div>

                  <div className={styles.rowMeta}>
                    id {contract.contractId} · vol{" "}
                    {safeNumber(contract.volume).toLocaleString()} m³ · reward{" "}
                    {safeNumber(contract.reward).toLocaleString()} ISK ·{" "}
                    {`${contract.pickupStructure.solarSystemName} (${contract.pickupStructure.name})` ||
                      "—"}{" "}
                    →{" "}
                    {`${contract.dropoffStructure.solarSystemName} (${contract.dropoffStructure.name})` ||
                      "—"}
                  </div>

                  {(contract.validationReasons.length > 0 ||
                    contract.adminDecision !== "none" ||
                    (contract.validationLevel === "warning" &&
                      !contract.adminValidated)) && (
                    <div className={styles.reasonPills}>
                      {contract.adminDecision === "rejected" && (
                        <span className={`${styles.pill} ${styles.pillFail}`}>
                          Rejected
                        </span>
                      )}
                      {contract.adminDecision === "approved" && (
                        <span className={`${styles.pill} ${styles.pillOk}`}>
                          Approved
                        </span>
                      )}
                      {contract.validationLevel === "warning" &&
                        !contract.adminValidated && (
                          <span className={`${styles.pill} ${styles.pillWarn}`}>
                            Needs validation
                          </span>
                        )}
                      {contract.validationReasons.slice(0, 4).map((r) => (
                        <span
                          key={r}
                          className={`${styles.pill} ${
                            contract.validationLevel === "fail"
                              ? styles.pillFail
                              : styles.pillWarn
                          }`}
                        >
                          {shortReason(r)}
                        </span>
                      ))}
                      {contract.validationReasons.length > 4 && (
                        <span className={`${styles.pill} ${styles.pillMuted}`}>
                          +{contract.validationReasons.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className={styles.rowControls}>
                  {contract.validationLevel === "warning" && (
                    <button
                      className={styles.miniButton}
                      onClick={() =>
                        setContractValidated(
                          contract.contractId,
                          !contract.adminValidated,
                        )
                      }
                    >
                      {contract.adminValidated ? "Unvalidate" : "Validate"}
                    </button>
                  )}

                  <select
                    className={styles.select}
                    value={contract.adminDecision}
                    onChange={(e) =>
                      setContractDecision(
                        contract.contractId,
                        e.target.value as "none" | "approved" | "rejected",
                      )
                    }
                  >
                    <option value="none">No override</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
            );
          })}

          {availableOutstandingContracts.length === 0 && (
            <div className={styles.empty}>
              No available outstanding contracts.
            </div>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.subtitle}>Planned / in progress</h3>

        <div className={styles.list}>
          {activeRuns.length === 0 && (
            <div className={styles.empty}>No active runs.</div>
          )}

          {activeRuns.map((runRow) => {
            const { totalReward, totalVolume } = calculateRunTotals(runRow);

            const fuelCost = completionFuelUsed * completionFuelCostPerUnit;
            const estimatedProfit = totalReward - fuelCost;

            const isCompletionOpen = runBeingCompletedId === runRow.id;

            return (
              <div key={runRow.id} className={styles.runCard}>
                <div className={styles.runTop}>
                  <div>
                    <div className={styles.runTitle}>
                      Run · {runRow.run.status.toUpperCase()}
                    </div>
                    <div className={styles.rowMeta}>
                      contracts <b>{runRow.run.contractIds.length}</b> · vol{" "}
                      <b>{totalVolume.toLocaleString()}</b> m³ · reward{" "}
                      <b>{totalReward.toLocaleString()}</b> ISK
                    </div>
                  </div>

                  <div className={styles.actions}>
                    {runRow.run.status === "planned" && (
                      <>
                        <button
                          className={styles.secondaryButton}
                          onClick={() => beginEditRun(runRow)}
                          disabled={
                            editingRunId !== null && editingRunId !== runRow.id
                          }
                        >
                          Edit
                        </button>

                        <button
                          className={styles.secondaryButton}
                          onClick={() => markRunInProgress(runRow.id)}
                          disabled={editingRunId === runRow.id}
                        >
                          Mark in progress
                        </button>
                      </>
                    )}
                    <button
                      className={styles.primaryButton}
                      onClick={() => openCompletionPanel(runRow.id)}
                    >
                      Complete
                    </button>
                  </div>
                </div>

                <div className={styles.pills}>
                  {runRow.run.contractIds.map((id) => (
                    <span key={id} className={styles.pill}>
                      {contractsById[id]?.title ?? id}
                    </span>
                  ))}
                </div>

                {editingRunId === runRow.id && (
                  <div className={styles.completePanel}>
                    <div
                      className={styles.subtitle}
                      style={{ marginBottom: 0 }}
                    >
                      Edit planned run
                    </div>

                    <div className={styles.summaryLine}>
                      Selected: <b>{draftContractIds.size}</b>
                    </div>

                    <div className={styles.list}>
                      {/* Candidates to add: available outstanding + contracts already in this run */}
                      {(() => {
                        const currentIds = new Set(
                          (runRow.run.contractIds ?? []).map(String),
                        );

                        const candidates = [
                          ...availableOutstandingContracts,
                          ...Array.from(currentIds)
                            .map((id) => contractsById[id])
                            .filter(Boolean),
                        ] as Contract[];

                        const uniqueById = new Map<string, Contract>();
                        for (const c of candidates)
                          uniqueById.set(c.contractId, c);

                        const list = Array.from(uniqueById.values());
                        list.sort(
                          (a, b) => safeNumber(b.volume) - safeNumber(a.volume),
                        );

                        return list.map((contract) => (
                          <label
                            key={contract.contractId}
                            className={styles.row}
                          >
                            <input
                              type="checkbox"
                              checked={draftContractIds.has(
                                contract.contractId,
                              )}
                              onChange={() =>
                                toggleDraftContract(contract.contractId)
                              }
                            />
                            <div className={styles.rowBody}>
                              <div className={styles.rowTitle}>
                                {contract.title ?? contract.contractId}
                              </div>
                              <div className={styles.rowMeta}>
                                vol{" "}
                                {safeNumber(contract.volume).toLocaleString()}{" "}
                                m³ · reward{" "}
                                {safeNumber(contract.reward).toLocaleString()}{" "}
                                ISK · {String(contract.startLocationId ?? "—")}{" "}
                                → {String(contract.endLocationId ?? "—")}
                              </div>
                            </div>
                          </label>
                        ));
                      })()}
                    </div>

                    <div className={styles.actions}>
                      <button
                        className={styles.primaryButton}
                        onClick={confirmEditRun}
                        disabled={isSavingRunEdits}
                      >
                        {isSavingRunEdits ? "Saving…" : "Confirm changes"}
                      </button>

                      <button
                        className={styles.secondaryButton}
                        onClick={cancelEditRun}
                        disabled={isSavingRunEdits}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {isCompletionOpen && (
                  <div className={styles.completePanel}>
                    <div className={styles.formRow}>
                      <label className={styles.label}>Fuel used</label>
                      <input
                        className={styles.input}
                        type="number"
                        min={0}
                        value={completionFuelUsed}
                        onChange={(e) =>
                          setCompletionFuelUsed(Number(e.target.value))
                        }
                      />
                    </div>

                    <div className={styles.formRow}>
                      <label className={styles.label}>
                        Fuel cost per unit (ISK)
                      </label>
                      <input
                        className={styles.input}
                        type="number"
                        min={0}
                        value={completionFuelCostPerUnit}
                        onChange={(e) =>
                          setCompletionFuelCostPerUnit(Number(e.target.value))
                        }
                      />
                    </div>

                    <div className={styles.formRow}>
                      <label className={styles.label}>Notes</label>
                      <input
                        className={styles.input}
                        value={completionNotes}
                        onChange={(e) => setCompletionNotes(e.target.value)}
                        placeholder="Optional"
                      />
                    </div>

                    <div className={styles.summaryLine}>
                      Fuel cost: <b>{fuelCost.toLocaleString()} ISK</b> ·
                      Profit: <b>{estimatedProfit.toLocaleString()} ISK</b>
                    </div>

                    <div className={styles.actions}>
                      <button
                        className={styles.primaryButton}
                        onClick={confirmCompleteRun}
                      >
                        Confirm complete
                      </button>
                      <button
                        className={styles.secondaryButton}
                        onClick={closeCompletionPanel}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
