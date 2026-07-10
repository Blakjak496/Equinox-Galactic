"use client";

import { ReactNode } from "react";
import styles from "./Panel.module.css";

export default function Panel(props: { children?: ReactNode | ReactNode[] }) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelBody}>
        <div className={styles.frame}>{props.children}</div>
      </div>
    </div>
  );
}
