import { onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const EVE_CLIENT_ID = defineSecret("EVE_CLIENT_ID");
const EVE_CLIENT_SECRET = defineSecret("EVE_CLIENT_SECRET");

function decodeJwtPayload(token: string): any {
  const [, payload] = token.split(".");
  const padded =
    payload.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((payload.length + 3) % 4);
  const json = Buffer.from(padded, "base64").toString("utf8");
  return JSON.parse(json);
}

export const exchangeEveCode = onCall(
  { region: "europe-west2", secrets: [EVE_CLIENT_ID, EVE_CLIENT_SECRET] },
  async (req) => {
    if (
      !req.auth?.token?.email ||
      req.auth.token.email !== "blakjak9462@gmail.com"
    ) {
      throw new Error("permission-denied");
    }

    const { code, codeVerifier, redirectUri } = req.data as {
      code: string;
      codeVerifier: string;
      redirectUri: string;
    };

    const basic = Buffer.from(
      `${EVE_CLIENT_ID.value()}:${EVE_CLIENT_SECRET.value()}`,
    ).toString("base64");

    const body = new URLSearchParams();
    body.set("grant_type", "authorization_code");
    body.set("code", code);
    body.set("code_verifier", codeVerifier);
    body.set("redirect_uri", redirectUri);

    const res = await fetch("https://login.eveonline.com/v2/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const text = await res.text();
    if (!res.ok)
      throw new Error(`EVE token exchange failed ${res.status}: ${text}`);

    const token = JSON.parse(text) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      token_type: string;
    };

    const payload = decodeJwtPayload(token.access_token);

    const CharacterID =
      payload.sub?.match(/\d+/)?.[0] ??
      payload.character_id ??
      payload.CharacterID ??
      null;

    const db = getFirestore();

    if (!CharacterID)
      throw new Error("Could not determine CharacterID from access token");

    const charRes = await fetch(
      `https://esi.evetech.net/latest/characters/${CharacterID}/?datasource=tranquility`,
      { headers: { Authorization: `Bearer ${token.access_token}` } },
    );
    const charText = await charRes.text();
    if (!charRes.ok)
      throw new Error(
        `Failed to fetch character info ${charRes.status}: ${charText}`,
      );

    const charJson = JSON.parse(charText) as {
      corporation_id: number;
      name?: string;
    };
    const CorporationID = charJson.corporation_id;

    await db.doc("esiAuth/main").set(
      {
        refreshToken: token.refresh_token,
        CharacterID: String(CharacterID),
        CorporationID: String(CorporationID),
        connectedAt: FieldValue.serverTimestamp(),
        jwtPayload: payload,
      },
      { merge: true },
    );

    return {
      ok: true,
      CharacterID: String(CharacterID),
      CorporationID: String(CorporationID),
    };
  },
);
