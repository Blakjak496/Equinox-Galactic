"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { canViewUnderConstruction } from "@/lib/underConstruction";
import styles from "./TopBar.module.css";

const TABS = [
  { href: "/jump-planner", label: "Jump Planner" },
  { href: "/ansiblex", label: "Ansiblex Bridges" },
  // Only shown to the corp currently previewing it - see
  // lib/underConstruction.ts and the matching <UnderConstruction> wrapper
  // on the page itself. Drop this flag once the tool is ready for everyone.
  { href: "/manufacturing-planner", label: "Manufacturing Planner", underConstruction: true },
];

export default function TopBar() {
  const pathname = usePathname() ?? "/";
  const { character, logout, logoutEverywhere } = useAuth();

  const visibleTabs = TABS.filter(
    (tab) => !tab.underConstruction || canViewUnderConstruction(character?.corporationId),
  );

  return (
    <header className={styles.topBar}>
      <span className={styles.brand}>
        Nox <strong>Tools</strong>
      </span>

      <nav className={styles.nav}>
        {visibleTabs.map((tab) => (
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
