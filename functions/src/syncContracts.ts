import { onSchedule } from "firebase-functions/v2/scheduler";
import { setGlobalOptions } from "firebase-functions/v2";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import {
  EVE_CLIENT_ID,
  EVE_CLIENT_SECRET,
  refreshAccessToken,
} from "./esi/token";
import {
  EsiCorpContract,
  StructureDoc,
  SystemDoc,
  TypeDoc,
  QuoteDoc,
  Validation,
  AuthConfig,
  ContractsWritePlanItem,
  CompletionDelta,
  CompletionWindowStats,
} from "./types/types";

setGlobalOptions({ region: "europe-west2" });

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseIsoDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthKeyFromDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function extractQuoteId(title: string | null | undefined): string | null {
  if (!title) return null;
  const match = title.match(/\bNOXG-[A-Z0-9]{6}-[A-Z0-9]{6}\b/);
  return match ? match[0] : null;
}

function uniqueNumbers(values: Array<number | null | undefined>): number[] {
  const set = new Set<number>();
  for (const v of values) if (isFiniteNumber(v)) set.add(v);
  return Array.from(set);
}

function deriveRouteKeyFromSystems(
  pickupSystemName: string | null,
  dropoffSystemName: string | null,
): string | null {
  if (!pickupSystemName || !dropoffSystemName) return null;

  const pickup = pickupSystemName.toUpperCase();
  const dropoff = dropoffSystemName.toUpperCase();

  if (pickup === "BKG-Q2" && dropoff !== "BKG-Q2") return `BKG-Q2|${dropoff}`;
  if (dropoff === "BKG-Q2" && pickup !== "BKG-Q2") return `BKG-Q2|${pickup}`;

  return null;
}

async function getAuthConfig(): Promise<AuthConfig> {
  const db = getFirestore();
  const authSnap = await db.doc("esiAuth/main").get();

  if (!authSnap.exists) throw new Error("Missing esiAuth/main doc");

  const data = authSnap.data() as Partial<AuthConfig>;

  if (!data.refreshToken || !data.CorporationID) {
    throw new Error("esiAuth/main missing refreshToken or CorporationID");
  }

  return {
    refreshToken: data.refreshToken,
    CorporationID: data.CorporationID,
    needsReconnect: data.needsReconnect,
  };
}

async function fetchJsonWithBearer<T>(
  url: string,
  accessToken: string,
  userAgent: string,
): Promise<{ status: number; ok: boolean; text: string; json: T | null }> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "User-Agent": userAgent,
    },
  });

  const text = await res.text();
  const json = text ? (JSON.parse(text) as T) : null;
  return { status: res.status, ok: res.ok, text, json };
}

/* -------------------------
   Cache helpers: systems/types/structures
   ------------------------- */

async function ensureSystemCached(
  db: FirebaseFirestore.Firestore,
  solarSystemId: number,
): Promise<SystemDoc> {
  const systemRef = db.collection("systems").doc(String(solarSystemId));
  const systemSnap = await systemRef.get();
  if (systemSnap.exists) return systemSnap.data() as SystemDoc;

  const url = `https://esi.evetech.net/latest/universe/systems/${solarSystemId}/?datasource=tranquility`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "EquinoxGalactic Admin (systems cache)",
    },
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`ESI system failed ${res.status}: ${text}`);

  const json = JSON.parse(text) as { name: string };

  const doc: SystemDoc = {
    solarSystemId,
    name: json.name,
    lastFetchedAt: FieldValue.serverTimestamp(),
  };

  await systemRef.set(doc, { merge: true });
  return doc;
}

async function ensureTypeCached(
  db: FirebaseFirestore.Firestore,
  typeId: number,
): Promise<TypeDoc> {
  const typeRef = db.collection("types").doc(String(typeId));
  const typeSnap = await typeRef.get();
  if (typeSnap.exists) return typeSnap.data() as TypeDoc;

  const url = `https://esi.evetech.net/latest/universe/types/${typeId}/?datasource=tranquility`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "EquinoxGalactic Admin (types cache)",
    },
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`ESI type failed ${res.status}: ${text}`);

  const json = JSON.parse(text) as { name: string };

  const doc: TypeDoc = {
    typeId,
    name: json.name,
    lastFetchedAt: FieldValue.serverTimestamp(),
  };

  await typeRef.set(doc, { merge: true });
  return doc;
}

async function ensureStructureCached(
  db: FirebaseFirestore.Firestore,
  accessToken: string,
  structureId: number,
): Promise<StructureDoc> {
  const structureRef = db.collection("structures").doc(String(structureId));
  const structureSnap = await structureRef.get();
  if (structureSnap.exists) return structureSnap.data() as StructureDoc;

  const url = `https://esi.evetech.net/latest/universe/structures/${structureId}/?datasource=tranquility`;

  const { status, ok, text, json } = await fetchJsonWithBearer<{
    name: string;
    owner_id: number;
    solar_system_id: number;
    type_id: number;
    position: { x: number; y: number; z: number };
  }>(url, accessToken, "EquinoxGalactic Admin (structures cache)");

  if (status === 403) {
    const forbiddenDoc: StructureDoc = {
      structureId: String(structureId),
      access: "forbidden",
      name: null,
      ownerId: null,
      solarSystemId: null,
      solarSystemName: null,
      typeId: null,
      typeName: null,
      position: null,
      lastFetchedAt: FieldValue.serverTimestamp(),
      lastError: "Forbidden",
    };
    await structureRef.set(forbiddenDoc, { merge: true });
    return forbiddenDoc;
  }

  if (!ok || !json) {
    throw new Error(`ESI structure failed ${status}: ${text}`);
  }

  const solarSystemId = json.solar_system_id;
  const typeId = json.type_id;

  const [systemDoc, typeDoc] = await Promise.all([
    ensureSystemCached(db, solarSystemId),
    ensureTypeCached(db, typeId),
  ]);

  const okDoc: StructureDoc = {
    structureId: String(structureId),
    access: "ok",
    name: json.name ?? null,
    ownerId: json.owner_id ?? null,
    solarSystemId: solarSystemId ?? null,
    solarSystemName: systemDoc?.name ?? null,
    typeId: typeId ?? null,
    typeName: typeDoc?.name ?? null,
    position: json.position ?? null,
    lastFetchedAt: FieldValue.serverTimestamp(),
    lastError: null,
  };

  await structureRef.set(okDoc, { merge: true });
  return okDoc;
}

/* -------------------------
   Validation
   ------------------------- */

function computeValidation(args: {
  pickupStructure: StructureDoc | null;
  dropoffStructure: StructureDoc | null;
  quote: QuoteDoc | null;

  contractReward: number | null;
  contractVolume: number | null;
  contractCollateral: number | null;
}): Validation {
  const reasons: string[] = [];

  const pickupForbidden = args.pickupStructure?.access === "forbidden";
  const dropoffForbidden = args.dropoffStructure?.access === "forbidden";

  if (pickupForbidden) reasons.push("STRUCTURE_FORBIDDEN_PICKUP");
  if (dropoffForbidden) reasons.push("STRUCTURE_FORBIDDEN_DROPOFF");

  if (reasons.length > 0) {
    return {
      level: "fail",
      reasons,
      message:
        "Cannot access pickup and/or dropoff structure. Contract must be rejected.",
      evaluatedAt: FieldValue.serverTimestamp(),
    };
  }

  if (!args.quote) {
    return {
      level: "warning",
      reasons: ["QUOTE_NOT_FOUND"],
      message:
        "Quote ID not found or quote record missing. Manual validation required.",
      evaluatedAt: FieldValue.serverTimestamp(),
    };
  }

  const pickupSystem = args.pickupStructure?.solarSystemName ?? null;
  const dropoffSystem = args.dropoffStructure?.solarSystemName ?? null;

  const derivedRouteKey = deriveRouteKeyFromSystems(
    pickupSystem,
    dropoffSystem,
  );

  if (!derivedRouteKey) reasons.push("ROUTE_UNSUPPORTED");
  else if (derivedRouteKey !== args.quote.routeKey)
    reasons.push("ROUTE_MISMATCH");

  if (
    isFiniteNumber(args.contractVolume) &&
    args.contractVolume !== args.quote.volumeM3
  ) {
    reasons.push("VOLUME_MISMATCH");
  }

  if (
    isFiniteNumber(args.contractCollateral) &&
    args.contractCollateral !== args.quote.collateral
  ) {
    reasons.push("COLLATERAL_MISMATCH");
  }

  if (
    isFiniteNumber(args.contractReward) &&
    args.contractReward !== args.quote.reward
  ) {
    reasons.push("REWARD_MISMATCH");
  }

  if (reasons.length > 0) {
    return {
      level: "warning",
      reasons,
      message:
        "Quote and contract differ on one or more price-driving fields. Manual validation required.",
      evaluatedAt: FieldValue.serverTimestamp(),
    };
  }

  return {
    level: "ok",
    reasons: [],
    message: null,
    evaluatedAt: FieldValue.serverTimestamp(),
  };
}

/* -------------------------
   Stats (snapshot + rolling deltas)
   ------------------------- */

function isOpenStatus(status: string): boolean {
  return status === "outstanding" || status === "in_progress";
}

function computeSnapshotCounts(courierContracts: EsiCorpContract[]) {
  let outstandingCount = 0;
  let inProgressCount = 0;

  for (const contract of courierContracts) {
    if (contract.status === "in_progress") inProgressCount += 1;
    if (isOpenStatus(contract.status)) outstandingCount += 1;
  }

  return { outstandingCount, inProgressCount };
}

function computeCompletionDelta(args: {
  writePlan: ContractsWritePlanItem[];
}): CompletionDelta {
  let completedDelta = 0;
  let completedRewardDelta = 0;
  const completedByMonthDelta: Record<string, number> = {};

  for (const item of args.writePlan) {
    const newStatus = item.esiContract.status;
    const oldStatus = item.existingStatus;

    const becomesCompleted =
      newStatus === "finished" &&
      (oldStatus !== "finished" || typeof oldStatus === "undefined");

    if (!becomesCompleted) continue;

    completedDelta += 1;

    const reward = isFiniteNumber(item.esiContract.reward)
      ? item.esiContract.reward
      : 0;
    completedRewardDelta += reward;

    const completedAt = parseIsoDate(item.esiContract.date_completed);
    if (completedAt) {
      const monthKey = monthKeyFromDate(completedAt);
      completedByMonthDelta[monthKey] =
        (completedByMonthDelta[monthKey] ?? 0) + reward;
    }
  }

  return { completedDelta, completedRewardDelta, completedByMonthDelta };
}

function computeAvgCompletionWindow7d(
  courierContracts: EsiCorpContract[],
): CompletionWindowStats {
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  let samples = 0;
  let totalSeconds = 0;

  for (const contract of courierContracts) {
    if (contract.status !== "finished") continue;

    const acceptedAt = parseIsoDate(contract.date_accepted);
    const completedAt = parseIsoDate(contract.date_completed);
    if (!acceptedAt || !completedAt) continue;

    if (now - completedAt.getTime() > sevenDaysMs) continue;

    const durationSeconds = Math.max(
      0,
      Math.floor((completedAt.getTime() - acceptedAt.getTime()) / 1000),
    );

    totalSeconds += durationSeconds;
    samples += 1;
  }

  if (samples === 0) {
    return { avgCompletionSeconds7d: null, avgCompletionSamples7d: 0 };
  }

  return {
    avgCompletionSeconds7d: Math.round(totalSeconds / samples),
    avgCompletionSamples7d: samples,
  };
}

/* -------------------------
   Quotes + enrichment helpers
   ------------------------- */

async function buildQuoteCache(
  db: FirebaseFirestore.Firestore,
  contractsToWrite: ContractsWritePlanItem[],
): Promise<Map<string, QuoteDoc | null>> {
  const quoteIds = Array.from(
    new Set(
      contractsToWrite
        .map((item) => extractQuoteId(item.esiContract.title ?? null))
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const quoteCache = new Map<string, QuoteDoc | null>();
  if (quoteIds.length === 0) return quoteCache;

  const quoteRefs = quoteIds.map((id) => db.collection("quotes").doc(id));
  const quoteSnaps = await db.getAll(...quoteRefs);

  for (let i = 0; i < quoteIds.length; i++) {
    const quoteId = quoteIds[i];
    const snap = quoteSnaps[i];

    if (!snap.exists) {
      quoteCache.set(quoteId, null);
      continue;
    }

    const raw = snap.data() as any;

    quoteCache.set(quoteId, {
      quoteId,
      routeKey: String(raw.routeKey),
      volumeM3: Number(raw.volumeM3),
      collateral: Number(raw.collateral),
      isRush: Boolean(raw.isRush),
      rushRate: Number(raw.rushRate),
      flatRate: Number(raw.flatRate),
      reward: Number(raw.reward),
    });
  }

  return quoteCache;
}

async function buildStructureCache(
  db: FirebaseFirestore.Firestore,
  accessToken: string,
  contractsToWrite: ContractsWritePlanItem[],
): Promise<Map<number, StructureDoc>> {
  const structureIds = uniqueNumbers(
    contractsToWrite.flatMap((item) => [
      item.esiContract.start_location_id ?? null,
      item.esiContract.end_location_id ?? null,
    ]),
  );

  const MAX_STRUCTURES_PER_RUN = 25;
  const structureIdsToEnrich = structureIds.slice(0, MAX_STRUCTURES_PER_RUN);

  const cache = new Map<number, StructureDoc>();

  for (const structureId of structureIdsToEnrich) {
    try {
      const structureDoc = await ensureStructureCached(
        db,
        accessToken,
        structureId,
      );
      cache.set(structureId, structureDoc);
    } catch (error: any) {
      const message = String(error?.message ?? error);

      await db
        .collection("structures")
        .doc(String(structureId))
        .set(
          {
            structureId: String(structureId),
            access: "ok",
            lastFetchedAt: FieldValue.serverTimestamp(),
            lastError: message,
          },
          { merge: true },
        );
    }
  }

  return cache;
}

/* -------------------------
   Main scheduled function
   ------------------------- */

export const syncContracts = onSchedule(
  {
    schedule: "every 2 hours",
    timeZone: "UTC",
    secrets: [EVE_CLIENT_ID, EVE_CLIENT_SECRET],
  },
  async () => {
    const db = getFirestore();

    try {
      /* 1) Auth + access token */
      const { refreshToken, CorporationID } = await getAuthConfig();
      const accessToken = await refreshAccessToken(refreshToken);

      /* 2) Pull ESI corp contracts, keep courier only */
      const contractsUrl = `https://esi.evetech.net/latest/corporations/${CorporationID}/contracts/?datasource=tranquility`;
      const contractsRes = await fetch(contractsUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "User-Agent": "EquinoxGalactic Admin (corp contracts sync)",
        },
      });

      const contractsText = await contractsRes.text();
      if (!contractsRes.ok) {
        throw new Error(
          `ESI corp contracts failed ${contractsRes.status}: ${contractsText}`,
        );
      }

      const allContracts = JSON.parse(contractsText) as EsiCorpContract[];
      const courierContracts = allContracts.filter((c) => c.type === "courier");

      /* 3) Snapshot stats from the ESI payload (no DB reads needed) */
      const { outstandingCount, inProgressCount } =
        computeSnapshotCounts(courierContracts);
      const completionWindow7d = computeAvgCompletionWindow7d(courierContracts);

      /* 4) Find contracts that need writing (new OR status changed) */
      const contractRefs = courierContracts.map((c) =>
        db.collection("contracts").doc(String(c.contract_id)),
      );

      const existingSnaps = contractRefs.length
        ? await db.getAll(...contractRefs)
        : [];

      const writePlan: ContractsWritePlanItem[] = [];

      for (let i = 0; i < courierContracts.length; i++) {
        const esiContract = courierContracts[i];
        const contractRef = contractRefs[i];
        const existingSnap = existingSnaps[i];

        const newStatus = esiContract.status;
        const existingStatus = existingSnap.exists
          ? (existingSnap.data()?.status as string | undefined)
          : undefined;

        const isNewContract = !existingSnap.exists;
        const statusChanged = existingStatus !== newStatus;

        if (isNewContract || statusChanged) {
          writePlan.push({ esiContract, contractRef, existingStatus });
        }
      }

      /* 5) Rolling lifetime stats delta (based only on what we are about to write) */
      const completionDelta = computeCompletionDelta({ writePlan });

      /* 6) Build enrichment caches for this run (structures + quotes) */
      const [structureCache, quoteCache] = await Promise.all([
        buildStructureCache(db, accessToken, writePlan),
        buildQuoteCache(db, writePlan),
      ]);

      /* 7) Write updated/new contracts */
      const batch = db.batch();
      let contractWrites = 0;

      for (const item of writePlan) {
        const contract = item.esiContract;

        const quoteId = extractQuoteId(contract.title ?? null);
        const quote = quoteId ? (quoteCache.get(quoteId) ?? null) : null;

        const pickupId = contract.start_location_id ?? null;
        const dropoffId = contract.end_location_id ?? null;

        const pickupStructure = isFiniteNumber(pickupId)
          ? (structureCache.get(pickupId) ?? null)
          : null;

        const dropoffStructure = isFiniteNumber(dropoffId)
          ? (structureCache.get(dropoffId) ?? null)
          : null;

        const validation = computeValidation({
          pickupStructure,
          dropoffStructure,
          quote,
          contractReward: isFiniteNumber(contract.reward)
            ? contract.reward
            : null,
          contractVolume: isFiniteNumber(contract.volume)
            ? contract.volume
            : null,
          contractCollateral: isFiniteNumber(contract.collateral)
            ? contract.collateral
            : null,
        });

        batch.set(
          item.contractRef,
          {
            contractId: String(contract.contract_id),
            type: contract.type ?? "unknown",
            status: contract.status,

            dateIssued: contract.date_issued,
            dateExpired: contract.date_expired,
            dateAccepted: contract.date_accepted ?? null,
            dateCompleted: contract.date_completed ?? null,

            title: contract.title ?? null,
            quoteId: quoteId ?? null,

            volume: contract.volume ?? null,
            reward: contract.reward ?? null,
            collateral: contract.collateral ?? null,

            startLocationId: contract.start_location_id ?? null,
            endLocationId: contract.end_location_id ?? null,

            issuerId: contract.issuer_id ?? null,
            issuerCorporationId: contract.issuer_corporation_id ?? null,
            assigneeId: contract.assignee_id ?? null,
            acceptorId: contract.acceptor_id ?? null,

            availability: contract.availability ?? null,
            forCorporation: contract.for_corporation ?? null,
            daysToComplete: contract.days_to_complete ?? null,

            price: contract.price ?? null,
            buyout: contract.buyout ?? null,

            pickupStructure: pickupStructure
              ? {
                  structureId: pickupStructure.structureId,
                  name: pickupStructure.name,
                  solarSystemId: pickupStructure.solarSystemId,
                  solarSystemName: pickupStructure.solarSystemName,
                  typeId: pickupStructure.typeId,
                  typeName: pickupStructure.typeName,
                  access: pickupStructure.access,
                }
              : null,

            dropoffStructure: dropoffStructure
              ? {
                  structureId: dropoffStructure.structureId,
                  name: dropoffStructure.name,
                  solarSystemId: dropoffStructure.solarSystemId,
                  solarSystemName: dropoffStructure.solarSystemName,
                  typeId: dropoffStructure.typeId,
                  typeName: dropoffStructure.typeName,
                  access: dropoffStructure.access,
                }
              : null,

            validation,

            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

        contractWrites += 1;
      }

      /* 8) Update stats doc (1 write, no reads) */
      const statsRef = db.doc("stats/contracts");

      const statsUpdate: Record<string, any> = {
        outstandingCount,
        inProgressCount,

        avgCompletionSeconds7d: completionWindow7d.avgCompletionSeconds7d,
        avgCompletionSamples7d: completionWindow7d.avgCompletionSamples7d,

        lastSyncAt: FieldValue.serverTimestamp(),
      };

      if (completionDelta.completedDelta > 0) {
        statsUpdate.completedTotal = FieldValue.increment(
          completionDelta.completedDelta,
        );
      }

      if (completionDelta.completedRewardDelta !== 0) {
        statsUpdate.revenueLifetime = FieldValue.increment(
          completionDelta.completedRewardDelta,
        );
      }

      for (const [monthKey, revenueDelta] of Object.entries(
        completionDelta.completedByMonthDelta,
      )) {
        statsUpdate[`revenueByMonth.${monthKey}`] =
          FieldValue.increment(revenueDelta);
      }

      batch.set(statsRef, statsUpdate, { merge: true });

      if (contractWrites > 0 || completionDelta.completedDelta > 0) {
        await batch.commit();
      } else {
        // No contract writes and no rolling updates. Still useful to record sync time.
        await statsRef.set(statsUpdate, { merge: true });
      }

      /* 9) Mark auth status clean */
      await db.doc("esiAuth/main").set(
        {
          needsReconnect: false,
          lastSyncAt: FieldValue.serverTimestamp(),
          lastSyncError: FieldValue.delete(),
        },
        { merge: true },
      );

      console.log(
        [
          `syncContracts ok`,
          `fetched=${allContracts.length}`,
          `courier=${courierContracts.length}`,
          `writes=${contractWrites}`,
          `outstanding=${outstandingCount}`,
          `inProgress=${inProgressCount}`,
          `completedDelta=${completionDelta.completedDelta}`,
          `revenueDelta=${completionDelta.completedRewardDelta}`,
        ].join(" "),
      );
    } catch (error: any) {
      const message = String(error?.message ?? error);

      const needsReconnect =
        message.includes("invalid_grant") ||
        message.includes("unauthorized") ||
        message.includes("forbidden");

      await db.doc("esiAuth/main").set(
        {
          lastSyncError: message,
          lastSyncAt: FieldValue.serverTimestamp(),
          needsReconnect,
        },
        { merge: true },
      );

      console.error("syncContracts error:", message);
    }
  },
);
