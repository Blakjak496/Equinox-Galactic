"use client";

import { ReactNode } from "react";
import Panel from "@/components/Panel/Panel";
import { useAuth } from "@/lib/auth/AuthContext";
import { canViewUnderConstruction } from "@/lib/underConstruction";
import styles from "./UnderConstruction.module.css";

// Wraps a page that's still being built. Renders `children` as normal for
// the one corp allowed to preview in-progress work; everyone else gets a
// plain placeholder instead of the real page - remove this wrapper (and
// TopBar's matching `underConstruction: true` entry) once the page is
// ready for everyone.
export default function UnderConstruction({ children }: { children: ReactNode }) {
  const { character } = useAuth();

  if (canViewUnderConstruction(character?.corporationId)) {
    return <>{children}</>;
  }

  return (
    <Panel>
      <div className={styles.placeholder}>
        <h2 className={styles.title}>Still being built</h2>
        <p className={styles.body}>This tool isn&apos;t ready yet - check back soon.</p>
      </div>
    </Panel>
  );
}
