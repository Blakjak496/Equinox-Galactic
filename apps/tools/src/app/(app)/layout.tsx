"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import TopBar from "@/components/TopBar/TopBar";
import styles from "./layout.module.css";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  if (status !== "authenticated") {
    return <div className={styles.loading}>Loading…</div>;
  }

  return (
    <div className={styles.shell}>
      <TopBar />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
