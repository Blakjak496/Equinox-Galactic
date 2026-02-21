import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../../firebase"; // your initialized firebase app
import { createUniqueId } from "@/utils";

const functions = getFunctions(app, "europe-west2");

const createQuote = httpsCallable(functions, "createQuote");

export async function saveQuoteRecord(payload: {
  routeKey: string;
  volumeM3: number;
  collateral: number;
  isRush: boolean;
  rushRate: number;
  flatRate: number;
  reward: number;
}) {
  const quoteId = createUniqueId();

  await createQuote({
    quoteId,
    ...payload,
  });

  return quoteId;
}
