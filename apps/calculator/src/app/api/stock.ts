import { BuyOrderResponse, CartQuote, StockItem, StockLocation } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export async function getStockLocations(): Promise<StockLocation[]> {
  const res = await fetch(`${API_URL}/stock/locations`);

  if (!res.ok) throw new Error("Stock locations request failed");

  const json = await res.json();
  return json.data as StockLocation[];
}

export async function getStock(locationId: string): Promise<StockItem[]> {
  const res = await fetch(
    `${API_URL}/stock?locationId=${encodeURIComponent(locationId)}`,
  );

  if (!res.ok) throw new Error("Stock request failed");

  const json = await res.json();
  return json.data as StockItem[];
}

export type QuoteCartResult =
  | { ok: true; data: CartQuote }
  | { ok: false; message: string };

export async function quoteCart(
  locationId: string,
  items: { typeId: number; quantity: number }[],
): Promise<QuoteCartResult> {
  const res = await fetch(`${API_URL}/stock/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locationId, items }),
  });

  const json = await res.json();

  if (!res.ok || !json.ok) {
    return { ok: false, message: json.message ?? "Failed to get cart total" };
  }

  return { ok: true, data: json.data as CartQuote };
}

export type SubmitBuyOrderResult =
  | { ok: true; data: BuyOrderResponse }
  | { ok: false; message: string };

export async function submitBuyOrder(
  customerCharacterName: string,
  locationId: string,
  items: { typeId: number; quantity: number }[],
): Promise<SubmitBuyOrderResult> {
  const res = await fetch(`${API_URL}/buy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerCharacterName, locationId, items }),
  });

  const json = await res.json();

  if (!res.ok || !json.ok) {
    return { ok: false, message: json.message ?? "Buy order failed" };
  }

  return { ok: true, data: json.data as BuyOrderResponse };
}
