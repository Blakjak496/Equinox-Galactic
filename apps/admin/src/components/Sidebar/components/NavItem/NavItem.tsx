"use client";

import styles from "./NavItem.module.css";

export default function NavItem(props: {
  name: string;
  callback: () => void;
  active: boolean;
}) {
  return (
    <button
      className={`${styles.navItem} ${props.active ? styles.active : ""}`}
      onClick={props.callback}
    >
      <label className={styles.label}>{props.name}</label>
    </button>
  );
}
