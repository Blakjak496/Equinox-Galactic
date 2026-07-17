"use client";

import { ReactNode } from "react";
import TopBar from "@/components/TopBar/TopBar";
import Sidebar from "@/components/Sidebar/Sidebar";
import styles from "./AppShell.module.css";
import { useEffect, useState } from "react";
import { auth, app } from "@/firebase";
import { apiFetch } from "@/lib/api";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";

export default function AppShell(props: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      if (!code) return;

      // Guard: never process the same auth code twice (prevents reload loops)
      const lastCode = sessionStorage.getItem("eve_last_code");
      if (lastCode === code) return;
      sessionStorage.setItem("eve_last_code", code);

      const expectedState = sessionStorage.getItem("eve_state");
      const verifier = sessionStorage.getItem("eve_pkce_verifier");

      if (!state || !expectedState || state !== expectedState) {
        console.error("EVE SSO state mismatch");
        return;
      }
      if (!verifier) {
        console.error("Missing PKCE verifier");
        return;
      }

      try {
        // apiFetch (not a bare fetch) so this actually carries the
        // x-admin-secret header the backend's adminAuth middleware
        // requires - a bare fetch here previously meant every reconnect
        // silently 401'd before the token exchange ever ran, leaving the
        // old (narrower-scoped) refresh token in place indefinitely.
        await apiFetch<{ ok: boolean }>("/auth/eve", {
          method: "POST",
          body: JSON.stringify({
            code,
            codeVerifier: verifier,
            redirectUri: "https://equinox-galactic-admin.web.app/",
          }),
        });
      } catch (err) {
        console.error("EVE SSO exchange failed:", err);
        alert(
          "EVE SSO reconnect failed - check the console and try again. The corp's ESI connection was not updated.",
        );
      }

      // cleanup
      sessionStorage.removeItem("eve_state");
      sessionStorage.removeItem("eve_pkce_verifier");

      url.searchParams.delete("code");
      url.searchParams.delete("state");

      // Firefox-safe: use a relative URL, not url.toString()
      const cleaned =
        url.pathname +
        (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "") +
        url.hash;

      window.history.replaceState({}, "", cleaned);
    })();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    // setUser(null);
  };

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  return (
    <div className={`starfield-overlay ${styles.shell}`}>
      <TopBar />
      <Sidebar
        login={() => signInWithPopup(auth, new GoogleAuthProvider())}
        signedIn={user !== null}
        logout={handleLogout}
      />
      <main className={styles.main}>{props.children}</main>
    </div>
  );
}
