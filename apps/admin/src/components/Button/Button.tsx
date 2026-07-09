"use client";

import { ReactNode } from "react";
import styles from "./Button.module.css";

export default function Button(props: {
  children: ReactNode;
  callback: () => void;
  color: "blue" | "orange" | "green" | "red";
  disabled?: boolean;
}) {
  return (
    <button
      className={`${styles.btn} ${styles[props.color]}`}
      onClick={props.callback}
      disabled={props.disabled}
    >
      {props.children}
    </button>
  );
}
