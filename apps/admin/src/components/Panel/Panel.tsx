"use client";

import { ReactNode } from "react";
import styles from "./Panel.module.css";

export default function Panel(props: { children?: ReactNode[] }) {
  return (
    <div className={`${styles.panel} ${styles.metric}`}>
      <div
        className={`${styles.cornerGlow} ${styles.cornerGlowTL} ${styles.cornerGlowOrange}`}
      ></div>
      <div
        className={`${styles.cornerGlow} ${styles.cornerGlowTR} ${styles.cornerGlowOrange}`}
      ></div>
      <div
        className={`${styles.cornerGlow} ${styles.cornerGlowBL} ${styles.cornerGlowOrange}`}
      ></div>
      <div
        className={`${styles.cornerGlow} ${styles.cornerGlowBR} ${styles.cornerGlowOrange}`}
      ></div>
      <div className={styles.panelBody}>
        <div className={styles.frame}>{props.children}</div>
      </div>
    </div>
  );
}
