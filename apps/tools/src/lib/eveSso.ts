function base64UrlEncode(bytes: Uint8Array) {
  let str = "";
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hash);
}

function randomString(len = 64) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export const TOOLS_REDIRECT_URI = "https://tools.equinoxgalactic.com/callback";

export async function startEveSso() {
  const clientId = process.env.NEXT_PUBLIC_TOOLS_EVE_CLIENT_ID!;

  const verifier = randomString(64);
  const challenge = base64UrlEncode(await sha256(verifier));
  const state = randomString(32);

  sessionStorage.setItem("tools_eve_pkce_verifier", verifier);
  sessionStorage.setItem("tools_eve_state", state);

  const params = new URLSearchParams({
    response_type: "code",
    redirect_uri: TOOLS_REDIRECT_URI,
    client_id: clientId,
    scope: "publicData",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  window.location.href = `https://login.eveonline.com/v2/oauth/authorize?${params.toString()}`;
}
