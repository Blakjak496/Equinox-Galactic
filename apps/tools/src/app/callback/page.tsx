"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { TOOLS_REDIRECT_URI } from "@/lib/eveSso";
import Panel from "@/components/Panel/Panel";
import styles from "../page.module.css";

export default function Callback() {
  const { completeLogin } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      if (!code) {
        setError("Missing authorization code from EVE SSO.");
        return;
      }

      const expectedState = sessionStorage.getItem("tools_eve_state");
      const verifier = sessionStorage.getItem("tools_eve_pkce_verifier");
      sessionStorage.removeItem("tools_eve_state");
      sessionStorage.removeItem("tools_eve_pkce_verifier");

      if (!state || !expectedState || state !== expectedState) {
        setError("Login failed - state mismatch. Please try again.");
        return;
      }
      if (!verifier) {
        setError("Login failed - missing verifier. Please try again.");
        return;
      }

      const result = await completeLogin(code, verifier, TOOLS_REDIRECT_URI);
      if (!result.ok) {
        setError(result.message ?? "Login failed.");
        return;
      }

      router.replace("/jump-planner");
    })();
  }, [completeLogin, router]);

  return (
    <div className={styles.container}>
      <Panel>
        <div className={styles.content}>
          {error ? (
            <>
              <p className={styles.error}>{error}</p>
              <a href="/">Back to login</a>
            </>
          ) : (
            <p className={styles.muted}>Logging in…</p>
          )}
        </div>
      </Panel>
    </div>
  );
}
