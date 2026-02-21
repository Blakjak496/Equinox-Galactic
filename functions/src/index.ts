/* eslint-disable */
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";

initializeApp();
const db = getFirestore();

type CreateQuoteData = {
  quoteId: string;
  routeKey: string;
  volumeM3: number;
  collateral: number;
  isRush: boolean;
  rushRate: number;
  flatRate: number;
  reward: number;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export const createQuote = onCall(
  {
    region: "europe-west2",
    enforceAppCheck: false, // turn this on once App Check is set up
  },
  async (request) => {
    const data = request.data as Partial<CreateQuoteData>;

    // Validate
    if (!isNonEmptyString(data.quoteId)) {
      throw new HttpsError("invalid-argument", "quoteId is required");
    }
    if (!isNonEmptyString(data.routeKey)) {
      throw new HttpsError("invalid-argument", "routeKey is required");
    }
    if (!isFiniteNumber(data.volumeM3) || data.volumeM3 <= 0) {
      throw new HttpsError("invalid-argument", "volumeM3 must be > 0");
    }
    if (!isFiniteNumber(data.collateral) || data.collateral < 0) {
      throw new HttpsError("invalid-argument", "collateral must be >= 0");
    }
    if (typeof data.isRush !== "boolean") {
      throw new HttpsError("invalid-argument", "isRush must be boolean");
    }
    if (!isFiniteNumber(data.rushRate)) {
      throw new HttpsError(
        "invalid-argument",
        "rushRate must be a valid number",
      );
    }
    if (!isFiniteNumber(data.flatRate)) {
      throw new HttpsError(
        "invalid-argument",
        "flatRate must be a valid number",
      );
    }

    if (!isFiniteNumber(data.reward) || data.reward <= 0) {
      throw new HttpsError("invalid-argument", "reward must be > 0");
    }

    if (data.volumeM3 > 340_000) {
      throw new HttpsError("invalid-argument", "volumeM3 too large");
    }
    if (data.collateral > 10_000_000_000) {
      throw new HttpsError("invalid-argument", "collateral too large");
    }

    const expiresAt = Timestamp.fromMillis(
      Date.now() + 60 * 24 * 60 * 60 * 1000,
    );

    const quoteRef = db.collection("quotes").doc(data.quoteId);

    await db.runTransaction(async (tx) => {
      const existing = await tx.get(quoteRef);
      if (existing.exists) {
        throw new HttpsError("already-exists", "quoteId already exists");
      }

      tx.set(quoteRef, {
        quoteId: data.quoteId,
        routeKey: data.routeKey,
        volumeM3: data.volumeM3,
        collateral: data.collateral,
        isRush: data.isRush,
        rushRate: data.rushRate,
        flatRate: data.flatRate,
        reward: data.reward,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt,
      });
    });

    return { ok: true, quoteId: data.quoteId };
  },
);
