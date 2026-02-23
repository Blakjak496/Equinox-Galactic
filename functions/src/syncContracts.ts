import { onSchedule } from "firebase-functions/v2/scheduler";
import { setGlobalOptions } from "firebase-functions/v2";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import {
  EVE_CLIENT_ID,
  EVE_CLIENT_SECRET,
  refreshAccessToken,
} from "./esi/token";

setGlobalOptions({ region: "europe-west2" });

type EsiCorpContract = {
  contract_id: number;
  type?: "unknown" | "item_exchange" | "auction" | "courier" | "loan";
  status: string;
  date_issued: string;
  date_expired: string;
  date_completed?: string;
  title?: string;
  volume?: number;
  reward?: number;
  collateral?: number;
  start_location_id?: number;
  end_location_id?: number;
  issuer_id?: number;
  assignee_id?: number;
};

type StructureDoc = {
  structureId: string;
  access: "ok" | "forbidden";
  name: string | null;
  ownerId: number | null;
  solarSystemId: number | null;
  solarSystemName: string | null;
  typeId: number | null;
  typeName: string | null;
  position: { x: number; y: number; z: number } | null;
  lastFetchedAt: unknown;
  lastError: string | null;
};

type SystemDoc = {
  solarSystemId: number;
  name: string;
  lastFetchedAt: unknown;
};

type TypeDoc = {
  typeId: number;
  name: string;
  lastFetchedAt: unknown;
};

type QuoteDoc = {
  quoteId: string;
  routeKey: string;
  volumeM3: number;
  collateral: number;
  isRush: boolean;
  rushRate: number;
  flatRate: number;
  reward: number;
};

type ValidationLevel = "ok" | "warning" | "fail";

type Validation = {
  level: ValidationLevel;
  reasons: string[];
  message: string | null;
  evaluatedAt: unknown;
};

async function getAuthConfig() {
  const db = getFirestore();
  const snap = await db.doc("esiAuth/main").get();
  if (!snap.exists) throw new Error("Missing esiAuth/main doc");
  const data = snap.data() as {
    refreshToken?: string;
    CorporationID?: string;
    needsReconnect?: boolean;
  };
  if (!data.refreshToken || !data.CorporationID) {
    throw new Error("esiAuth/main missing refreshToken or CorporationID");
  }
  return data;
}

function extractQuoteId(title: string | undefined | null): string | null {
  if (!title) return null;
  const match = title.match(/\bNOXG-[A-Z0-9]{6}-[A-Z0-9]{6}\b/);
  return match ? match[0] : null;
}

function uniqueNumbers(values: Array<number | undefined | null>) {
  const set = new Set<number>();
  for (const v of values)
    if (typeof v === "number" && Number.isFinite(v)) set.add(v);
  return Array.from(set);
}

async function fetchJsonWithBearer<T>(
  url: string,
  accessToken: string,
  userAgent: string,
) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "User-Agent": userAgent,
    },
  });

  const text = await res.text();

  return { res, text, json: text ? (JSON.parse(text) as T) : (null as any) };
}

async function ensureSystemCached(
  db: FirebaseFirestore.Firestore,
  solarSystemId: number,
) {
  const ref = db.collection("systems").doc(String(solarSystemId));
  const snap = await ref.get();
  if (snap.exists) return snap.data() as SystemDoc;

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

  await ref.set(doc, { merge: true });
  return doc;
}

async function ensureTypeCached(
  db: FirebaseFirestore.Firestore,
  typeId: number,
) {
  const ref = db.collection("types").doc(String(typeId));
  const snap = await ref.get();
  if (snap.exists) return snap.data() as TypeDoc;

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

  await ref.set(doc, { merge: true });
  return doc;
}

/**
 * Ensures a structure doc exists in cache.
 * - 200: stores details
 * - 403: stores access=forbidden
 * - other errors: throws (treated as transient)
 */
async function ensureStructureCached(
  db: FirebaseFirestore.Firestore,
  accessToken: string,
  structureId: number,
) {
  const ref = db.collection("structures").doc(String(structureId));
  const snap = await ref.get();
  if (snap.exists) return snap.data() as StructureDoc;

  const url = `https://esi.evetech.net/latest/universe/structures/${structureId}/?datasource=tranquility`;
  const { res, text, json } = await fetchJsonWithBearer<{
    name: string;
    owner_id: number;
    solar_system_id: number;
    type_id: number;
    position: { x: number; y: number; z: number };
  }>(url, accessToken, "EquinoxGalactic Admin (structures cache)");

  if (res.status === 403) {
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
    await ref.set(forbiddenDoc, { merge: true });
    return forbiddenDoc;
  }

  if (!res.ok) {
    throw new Error(`ESI structure failed ${res.status}: ${text}`);
  }

  const solarSystemId = json.solar_system_id;
  const typeId = json.type_id;

  const [system, type] = await Promise.all([
    ensureSystemCached(db, solarSystemId),
    ensureTypeCached(db, typeId),
  ]);

  const okDoc: StructureDoc = {
    structureId: String(structureId),
    access: "ok",
    name: json.name ?? null,
    ownerId: json.owner_id ?? null,
    solarSystemId: solarSystemId ?? null,
    solarSystemName: system?.name ?? null,
    typeId: typeId ?? null,
    typeName: type?.name ?? null,
    position: json.position ?? null,
    lastFetchedAt: FieldValue.serverTimestamp(),
    lastError: null,
  };

  await ref.set(okDoc, { merge: true });
  return okDoc;
}

function deriveRouteKeyFromSystems(
  pickupSystemName: string | null,
  dropoffSystemName: string | null,
) {
  if (!pickupSystemName || !dropoffSystemName) return null;

  const a = pickupSystemName.toUpperCase();
  const b = dropoffSystemName.toUpperCase();

  if (a === "BKG-Q2" && b !== "BKG-Q2") return `BKG-Q2|${b}`;
  if (b === "BKG-Q2" && a !== "BKG-Q2") return `BKG-Q2|${a}`;

  return null;
}

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
      level: "fail" as const,
      reasons,
      message:
        "Cannot access pickup and/or dropoff structure. Contract must be rejected.",
      evaluatedAt: FieldValue.serverTimestamp(),
    };
  }

  if (!args.quote) {
    return {
      level: "warning" as const,
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

  if (!derivedRouteKey) {
    reasons.push("ROUTE_UNSUPPORTED");
  } else if (derivedRouteKey !== args.quote.routeKey) {
    reasons.push("ROUTE_MISMATCH");
  }

  if (
    typeof args.contractVolume === "number" &&
    Number.isFinite(args.contractVolume) &&
    typeof args.quote.volumeM3 === "number" &&
    Number.isFinite(args.quote.volumeM3) &&
    args.contractVolume !== args.quote.volumeM3
  ) {
    reasons.push("VOLUME_MISMATCH");
  }

  if (
    typeof args.contractCollateral === "number" &&
    Number.isFinite(args.contractCollateral) &&
    typeof args.quote.collateral === "number" &&
    Number.isFinite(args.quote.collateral) &&
    args.contractCollateral !== args.quote.collateral
  ) {
    reasons.push("COLLATERAL_MISMATCH");
  }

  if (
    typeof args.contractReward === "number" &&
    Number.isFinite(args.contractReward) &&
    typeof args.quote.reward === "number" &&
    Number.isFinite(args.quote.reward) &&
    args.contractReward !== args.quote.reward
  ) {
    reasons.push("REWARD_MISMATCH");
  }

  if (reasons.length > 0) {
    return {
      level: "warning" as const,
      reasons,
      message:
        "Quote and contract differ on one or more price-driving fields. Manual validation required.",
      evaluatedAt: FieldValue.serverTimestamp(),
    };
  }

  return {
    level: "ok" as const,
    reasons: [],
    message: null,
    evaluatedAt: FieldValue.serverTimestamp(),
  };
}

/**
 * Fetch corp courier contracts and upsert:
 * - only when new OR status changed
 * - caches structures/systems/types as needed
 * - sets validation level:
 *   - fail if structure forbidden
 *   - warning if quote missing/mismatch
 */
export const syncContracts = onSchedule(
  {
    schedule: "every 2 hours",
    timeZone: "UTC",
    secrets: [EVE_CLIENT_ID, EVE_CLIENT_SECRET],
  },
  async () => {
    const db = getFirestore();

    try {
      const { refreshToken, CorporationID } = await getAuthConfig();
      const accessToken = await refreshAccessToken(refreshToken!);

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

      const contractDocRefs = courierContracts.map((c) =>
        db.collection("contracts").doc(String(c.contract_id)),
      );
      const existingSnaps = courierContracts.length
        ? await db.getAll(...contractDocRefs)
        : [];

      const contractsToWrite: Array<{
        esi: EsiCorpContract;
        ref: FirebaseFirestore.DocumentReference;
        existingStatus?: string;
      }> = [];

      for (let i = 0; i < courierContracts.length; i++) {
        const esiContract = courierContracts[i];
        const ref = contractDocRefs[i];
        const snap = existingSnaps[i];

        const newStatus = esiContract.status;
        const oldStatus = snap.exists
          ? (snap.data()?.status as string | undefined)
          : undefined;

        if (!snap.exists || oldStatus !== newStatus) {
          contractsToWrite.push({
            esi: esiContract,
            ref,
            existingStatus: oldStatus,
          });
        }
      }

      const structureIdsNeeded = uniqueNumbers(
        contractsToWrite.flatMap((c) => [
          c.esi.start_location_id ?? null,
          c.esi.end_location_id ?? null,
        ]),
      );

      const MAX_STRUCTURES_PER_RUN = 25;
      const structureIdsToEnrich = structureIdsNeeded.slice(
        0,
        MAX_STRUCTURES_PER_RUN,
      );

      const structureCache = new Map<number, StructureDoc>();
      for (const structureId of structureIdsToEnrich) {
        try {
          const doc = await ensureStructureCached(db, accessToken, structureId);
          structureCache.set(structureId, doc);
        } catch (e: any) {
          const msg = String(e?.message ?? e);
          await db
            .collection("structures")
            .doc(String(structureId))
            .set(
              {
                structureId: String(structureId),
                access: "ok", // unknown is nicer, but keeping schema simple
                lastFetchedAt: FieldValue.serverTimestamp(),
                lastError: msg,
              },
              { merge: true },
            );
        }
      }

      const quoteIdsNeeded = Array.from(
        new Set(
          contractsToWrite
            .map((c) => extractQuoteId(c.esi.title))
            .filter((x): x is string => Boolean(x)),
        ),
      );

      const quoteDocRefs = quoteIdsNeeded.map((id) =>
        db.collection("quotes").doc(id),
      );
      const quoteSnaps = quoteDocRefs.length
        ? await db.getAll(...quoteDocRefs)
        : [];
      const quoteCache = new Map<string, QuoteDoc | null>();

      for (let i = 0; i < quoteIdsNeeded.length; i++) {
        const quoteId = quoteIdsNeeded[i];
        const snap = quoteSnaps[i];
        if (!snap.exists) {
          quoteCache.set(quoteId, null);
          continue;
        }
        const data = snap.data() as any;
        quoteCache.set(quoteId, {
          quoteId,
          routeKey: String(data.routeKey),
          volumeM3: Number(data.volumeM3),
          collateral: Number(data.collateral),
          isRush: Boolean(data.isRush),
          rushRate: Number(data.rushRate),
          flatRate: Number(data.flatRate),
          reward: Number(data.reward),
        });
      }

      const batch = db.batch();
      let writes = 0;

      for (const item of contractsToWrite) {
        const c = item.esi;

        const quoteId = extractQuoteId(c.title);
        const quote = quoteId ? (quoteCache.get(quoteId) ?? null) : null;

        const pickupId = c.start_location_id ?? null;
        const dropoffId = c.end_location_id ?? null;

        const pickupStructure =
          typeof pickupId === "number"
            ? (structureCache.get(pickupId) ?? null)
            : null;
        const dropoffStructure =
          typeof dropoffId === "number"
            ? (structureCache.get(dropoffId) ?? null)
            : null;

        const validation = computeValidation({
          pickupStructure,
          dropoffStructure,
          quote,
          contractReward: typeof c.reward === "number" ? c.reward : null,
          contractVolume: typeof c.volume === "number" ? c.volume : null,
          contractCollateral:
            typeof c.collateral === "number" ? c.collateral : null,
        });

        batch.set(
          item.ref,
          {
            contractId: String(c.contract_id),
            type: c.type ?? "unknown",
            status: c.status,

            dateIssued: c.date_issued,
            dateExpired: c.date_expired,
            dateCompleted: c.date_completed ?? null,

            title: c.title ?? null,
            quoteId: quoteId ?? null,

            volume: c.volume ?? null,
            reward: c.reward ?? null,
            collateral: c.collateral ?? null,

            startLocationId: c.start_location_id ?? null,
            endLocationId: c.end_location_id ?? null,

            issuerId: c.issuer_id ?? null,
            assigneeId: c.assignee_id ?? null,

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

        writes++;
      }

      if (writes > 0) await batch.commit();

      await db.doc("esiAuth/main").set(
        {
          needsReconnect: false,
          lastSyncAt: FieldValue.serverTimestamp(),
          lastSyncError: FieldValue.delete(),
        },
        { merge: true },
      );

      console.log(
        `syncContracts: fetched=${allContracts.length} courier=${courierContracts.length} wrote=${writes} structuresEnriched=${structureIdsToEnrich.length}`,
      );
    } catch (err: any) {
      const msg = String(err?.message ?? err);

      const needsReconnect =
        msg.includes("invalid_grant") ||
        msg.includes("unauthorized") ||
        msg.includes("forbidden");

      await db.doc("esiAuth/main").set(
        {
          lastSyncError: msg,
          lastSyncAt: FieldValue.serverTimestamp(),
          needsReconnect,
        },
        { merge: true },
      );

      console.error("syncContracts error:", msg);
    }
  },
);
