"use client";

import styles from "./Button.module.css";

export default function Button(props: {
  type: 1 | 2 | 3;
  text: string;
  onClick: () => any;
}) {
  enum ButtonType {
    "primary" = 1,
    "secondary",
    "tertiary",
  }

  return (
    <button
      className={`${styles.button} ${styles[ButtonType[props.type]]}`}
      onClick={props.onClick}
    >
      {props.text}
    </button>
  );
}
