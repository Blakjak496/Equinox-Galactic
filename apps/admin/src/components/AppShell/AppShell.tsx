"use client";

import { ReactNode } from "react";
import TopBar from "@/components/TopBar/TopBar";
import Sidebar from "@/components/Sidebar/Sidebar";
import styles from "./AppShell.module.css";
import { useEffect, useState } from "react";
import { auth, app } from "@/firebase";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
  UserCredential,
} from "firebase/auth";

import { httpsCallable, getFunctions } from "firebase/functions";

const functions = getFunctions(app, "europe-west2");
const exchangeEveCode = httpsCallable(functions, "exchangeEveCode");

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

      await exchangeEveCode({
        code,
        codeVerifier: verifier,
        redirectUri: "https://equinox-galactic-admin.web.app/",
      });

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
