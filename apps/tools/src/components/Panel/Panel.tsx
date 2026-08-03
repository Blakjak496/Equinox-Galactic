"use client";

import { ReactNode } from "react";
import styles from "./Panel.module.css";

export default function Panel(props: { children?: ReactNode | ReactNode[] }) {
  return <div className={styles.card}>{props.children}</div>;
}
