import { defineSecret } from "firebase-functions/params";

export const EVE_CLIENT_ID = defineSecret("EVE_CLIENT_ID");
export const EVE_CLIENT_SECRET = defineSecret("EVE_CLIENT_SECRET");

export async function refreshAccessToken(refreshToken: string) {
  const creds = Buffer.from(
    `${EVE_CLIENT_ID.value()}:${EVE_CLIENT_SECRET.value()}`,
  ).toString("base64");

  const body = new URLSearchParams();
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", refreshToken);

  const res = await fetch("https://login.eveonline.com/v2/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const text = await res.text();
  if (!res.ok) {
    if (text.includes("invalid_grant")) throw new Error("invalid_grant");
    throw new Error(`Token refresh failed ${res.status}: ${text}`);
  }

  const json = JSON.parse(text) as { access_token: string };
  return json.access_token;
}
