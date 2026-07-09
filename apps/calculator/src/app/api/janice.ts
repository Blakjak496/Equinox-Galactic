import { JaniceAppraisal } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export async function handleGetAppraisal(
  itemsText: string,
): Promise<JaniceAppraisal> {
  const res = await fetch(`${API_URL}/appraisal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemsText }),
  });

  if (!res.ok) throw new Error("Appraisal request failed");

  const json = await res.json();
  return json.data as JaniceAppraisal;
}
