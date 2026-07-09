"use client";

import styles from "./TopBar.module.css";

export default function TopBar() {
  return (
    <div className={styles.bar}>
      <div className={styles.title}>
        <span>Admin Control</span>
      </div>
    </div>
  );
}
