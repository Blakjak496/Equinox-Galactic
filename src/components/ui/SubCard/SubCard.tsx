"use client";

import { ReactNode } from "react";
import styles from "./SubCard.module.css";

export default function SubCard(props: {
  children?: ReactNode;
  mainTitle?: string;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.mainTitle}>{props.mainTitle}</span>
      </div>
      {props.children}
    </div>
  );
}
