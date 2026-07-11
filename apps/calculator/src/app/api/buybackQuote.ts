import { BuybackLocation, BuybackQuoteResponse } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export async function getBuybackQuote(
  itemsText: string,
  locationId: string,
): Promise<BuybackQuoteResponse> {
  const res = await fetch(`${API_URL}/buyback/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemsText, locationId }),
  });

  if (!res.ok) throw new Error("Buyback quote request failed");

  const json = await res.json();
  return json.data as BuybackQuoteResponse;
}

export async function getBuybackLocations(): Promise<BuybackLocation[]> {
  const res = await fetch(`${API_URL}/buyback/locations`);

  if (!res.ok) throw new Error("Buyback locations request failed");

  const json = await res.json();
  return json.data as BuybackLocation[];
}
