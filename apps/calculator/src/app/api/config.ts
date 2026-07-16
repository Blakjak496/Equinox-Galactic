const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export type PublicConfig = {
  runnersEnabled: boolean;
  cartelEnabled: boolean;
};

export async function getPublicConfig(): Promise<PublicConfig> {
  const res = await fetch(`${API_URL}/config`, { cache: "no-store" });

  if (!res.ok) throw new Error("Config request failed");

  const json = await res.json();
  return json.data as PublicConfig;
}
