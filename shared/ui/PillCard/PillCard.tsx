"use client";

import { ReactNode } from "react";
import styles from "./PillCard.module.css";

type Props = {
  children?: ReactNode;
  type?: "warning" | "success" | "danger";
};

export default function PillCard({ children, type }: Props) {
  return (
    <div className={`${styles.card} ${type ? styles[type] : ""}`}>
      {children}
    </div>
  );
}
