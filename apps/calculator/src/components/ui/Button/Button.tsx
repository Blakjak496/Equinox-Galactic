"use client";

import { ReactNode } from "react";
import styles from "./Button.module.css";

type Props = {
  type: 1 | 2 | 3;
  children: ReactNode;
  onClick: () => any;
  disabled: boolean;
};

export default function Button({ type, onClick, children, disabled }: Props) {
  enum ButtonType {
    "primary" = 1,
    "secondary",
    "tertiary",
  }

  return (
    <button
      className={`${styles.button} ${styles[ButtonType[type]]}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
