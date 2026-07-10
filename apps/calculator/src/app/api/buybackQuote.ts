import { BuybackQuoteResponse } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export async function getBuybackQuote(
  itemsText: string,
): Promise<BuybackQuoteResponse> {
  const res = await fetch(`${API_URL}/buyback/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemsText }),
  });

  if (!res.ok) throw new Error("Buyback quote request failed");

  const json = await res.json();
  return json.data as BuybackQuoteResponse;
}
