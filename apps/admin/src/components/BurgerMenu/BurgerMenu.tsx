"use client";

import styles from "./BurgerMenu.module.css";

type Props = {
  onClick: () => void;
  open: boolean;
};

export default function BurgerMenu({ onClick, open }: Props) {
  return (
    <button className={styles.button} onClick={onClick}>
      <div
        className={`${styles.lineOne} ${open ? styles.middle : styles.top} ${open ? styles.diagonalUp : styles.flat}`}
      ></div>
      <div
        className={`${styles.lineTwo} ${styles.middle} ${open ? styles.out : ""}`}
      ></div>
      <div
        className={`${styles.lineThree} ${open ? styles.middle : styles.bottom} ${open ? styles.diagonalDown : styles.flat}`}
      ></div>
    </button>
  );
}
