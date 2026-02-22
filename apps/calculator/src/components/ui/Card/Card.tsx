"use client";

import { ReactNode } from "react";
import styles from "./Card.module.css";

export default function Card(props: {
  children?: ReactNode;
  mainTitle?: string;
  subtitle?: string;
}) {
  return (
    <div className={styles.card}>
      {props.mainTitle && (
        <div className={styles.header}>
          <span className={styles.mainTitle}>{props.mainTitle}</span>
          <span className={styles.subtitle}>{props.subtitle}</span>
        </div>
      )}
      {props.children}
    </div>
  );
}
