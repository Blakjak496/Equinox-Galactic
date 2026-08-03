"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import Button from "@/components/Button/Button";
import styles from "./page.module.css";

export default function Home() {
  const { status, message, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/jump-planner");
  }, [status, router]);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <span className={styles.eyebrow}>Nox Tools</span>
        <h1 className={styles.title}>
          EVE Online <span className={styles.titleAccent}>navigation tools</span>
        </h1>
        <p className={styles.subtitle}>
          Jump Planner and known Ansiblex bridges.
        </p>

        {status === "loading" ? (
          <p className={styles.muted}>Checking your session…</p>
        ) : (
          <>
            {message && <p className={styles.error}>{message}</p>}
            <Button callback={login} color="blue">
              Log in with EVE Online
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
