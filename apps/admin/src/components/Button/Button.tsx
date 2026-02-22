"use client";

import { ReactNode } from "react";
import styles from "./Button.module.css";

export default function Button(props: {
  children: ReactNode;
  callback: () => void;
  color: "blue" | "orange" | "green" | "red";
}) {
  return (
    <button
      className={`${styles.btn} ${styles[props.color]}`}
      onClick={props.callback}
    >
      {props.children}
    </button>
  );
}
