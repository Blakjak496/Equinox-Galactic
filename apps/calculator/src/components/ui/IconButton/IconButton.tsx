"use client";

import styles from "./IconButton.module.css";

export default function IconButton(props: {
  alt: string;
  onClick: (e: any) => void;
}) {
  return (
    <button
      className={styles.button}
      onClick={props.onClick}
      aria-label={props.alt}
      title={props.alt}
    >
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="8" y="8" width="13" height="13" rx="1.5" />
        <path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4H4.5A1.5 1.5 0 0 0 3 5.5v10A1.5 1.5 0 0 0 4.5 17H8" />
      </svg>
    </button>
  );
}
