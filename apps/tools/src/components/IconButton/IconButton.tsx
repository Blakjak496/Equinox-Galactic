"use client";

import styles from "./IconButton.module.css";

type IconName = "up" | "down" | "delete" | "refresh";

const ICON_PATHS: Record<IconName, React.ReactNode> = {
  up: <path d="M6 15l6-6 6 6" />,
  down: <path d="M6 9l6 6 6-6" />,
  delete: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </>
  ),
  refresh: (
    <>
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
      <path d="M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </>
  ),
};

export default function IconButton(props: {
  icon: IconName;
  callback: () => void;
  color: "blue" | "orange" | "green" | "red";
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`${styles.btn} ${styles[props.color]}`}
      onClick={props.callback}
      disabled={props.disabled}
      aria-label={props.ariaLabel}
      title={props.ariaLabel}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        width="1rem"
        height="1rem"
      >
        {ICON_PATHS[props.icon]}
      </svg>
    </button>
  );
}
