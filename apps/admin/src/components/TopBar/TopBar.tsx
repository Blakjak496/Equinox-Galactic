"use client";

import styles from "./TopBar.module.css";

export default function TopBar() {
  return (
    <div className={styles.bar}>
      <div className={styles.brandTab}>
        <img
          className={styles.bannerLogo}
          src="/banner-logo.png"
          alt="Equinox Galactic Banner Logo"
        />
      </div>
      <div className={styles.title}>
        <span>Admin Control</span>
      </div>
    </div>
  );
}
