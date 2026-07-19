"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useLocale } from "@/lib/LocaleContext";
import type { Locale } from "@/lib/i18n";
import styles from "./TopBar.module.css";

const NAV_ITEMS: { label: string; href: string }[] = [
  { label: "Home", href: "/" },
  { label: "Runners", href: "/runners" },
  { label: "Cartel", href: "/cartel" },
  { label: "Buyback", href: "/cartel/buyback" },
  { label: "Purchase", href: "/cartel/purchase" },
];

const SECTION_TITLES: {
  match: (path: string) => boolean;
  lines: [string, string];
}[] = [
  { match: (p) => p === "/runners", lines: ["Equinox", "Runners"] },
  { match: (p) => p.startsWith("/cartel"), lines: ["Equinox", "Cartel"] },
  { match: () => true, lines: ["Equinox", "Galactic"] },
];

function getTitleLines(pathname: string): [string, string] {
  const section = SECTION_TITLES.find((s) => s.match(pathname));
  return section ? section.lines : SECTION_TITLES[SECTION_TITLES.length - 1].lines;
}

export default function TopBar() {
  const pathname = usePathname() ?? "/";
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const [titleLine1, titleLine2] = getTitleLines(pathname);
  // Discord invite button disabled for now - no invite link configured yet.
  // Uncomment this line (and the button below) once
  // NEXT_PUBLIC_DISCORD_INVITE_URL is set to re-enable it.
  // const discordUrl = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL;

  const closeMenu = () => setOpen(false);

  return (
    <header className={styles.topBar}>
      <Link href="/" className={styles.brand} onClick={closeMenu}>
        <img src="/crest.png" alt="Equinox crest" className={styles.crest} />
        <span className={styles.wordmark}>
          {titleLine1}
          <br />
          {titleLine2}
        </span>
      </Link>

      <nav className={`${styles.nav} ${open ? styles.navOpen : ""}`}>
        <ul className={styles.navList}>
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`${styles.navLink} ${
                  pathname === item.href ? styles.navLinkActive : ""
                }`}
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className={styles.navActions}>
          {/* Discord invite button disabled for now - see discordUrl comment
              above. Uncomment both to re-enable.
          {discordUrl && (
            <a
              href={discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.discordButton}
              onClick={closeMenu}
            >
              Join Discord
            </a>
          )}
          */}
          <select
            className={styles.localeSelect}
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            aria-label="Language"
          >
            <option value="en">English</option>
            <option value="ru">Русский</option>
            <option value="zh">简体中文</option>
          </select>
        </div>
      </nav>

      <button
        type="button"
        className={`${styles.burgerButton} ${open ? styles.burgerOpen : ""}`}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span />
        <span />
        <span />
      </button>
    </header>
  );
}
