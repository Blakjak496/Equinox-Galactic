"use client";

import styles from "./IconButton.module.css";

export default function IconButton(props: {
  src: string;
  alt: string;
  onClick: () => void;
}) {
  return (
    <button className={styles.button} onClick={props.onClick}>
      <a>
        <img src={props.src} alt={props.alt} className={styles.icon} />
      </a>
    </button>
  );
}
