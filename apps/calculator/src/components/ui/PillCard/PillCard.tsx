"use client";

import { ReactNode } from "react";
import styles from "./PillCard.module.css";

export default function PillCard(props: { children?: ReactNode }) {
  return <div className={styles.card}>{props.children}</div>;
}
