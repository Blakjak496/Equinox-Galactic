"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./RoutesLayout.module.css";

const TABS = [
  { href: "/routes", label: "Routes" },
  { href: "/routes/main-routes", label: "Main Routes" },
  { href: "/routes/ship-categories", label: "Ship Categories" },
  { href: "/routes/jump-planner", label: "Jump Planner" },
  { href: "/routes/keepstar-planner", label: "Keepstar Planner" },
];

export default function RoutesLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      <nav className={styles.tabBar}>
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${styles.tab} ${pathname === tab.href ? styles.tabActive : ""}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
