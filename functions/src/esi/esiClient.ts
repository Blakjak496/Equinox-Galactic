export async function esiGet<T>(url: string, accessToken: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "User-Agent": "EquinoxGalactic Admin (contracts sync)",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ESI GET failed ${res.status}: ${text}`);
  }

  return (await res.json()) as T;
}
