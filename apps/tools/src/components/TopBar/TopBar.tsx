"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import styles from "./TopBar.module.css";

const TABS = [
  { href: "/jump-planner", label: "Jump Planner" },
  { href: "/ansiblex", label: "Ansiblex Bridges" },
  { href: "/manufacturing-planner", label: "Manufacturing Planner" },
];

export default function TopBar() {
  const pathname = usePathname() ?? "/";
  const { character, logout, logoutEverywhere } = useAuth();

  return (
    <header className={styles.topBar}>
      <span className={styles.brand}>
        Nox <strong>Tools</strong>
      </span>

      <nav className={styles.nav}>
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${styles.navLink} ${pathname === tab.href ? styles.navLinkActive : ""}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className={styles.account}>
        <span className={styles.characterName}>{character?.characterName ?? "Unknown"}</span>
        <button type="button" className={styles.linkButton} onClick={logout}>
          Logout
        </button>
        <button type="button" className={styles.linkButton} onClick={logoutEverywhere}>
          Log out everywhere
        </button>
      </div>
    </header>
  );
}
