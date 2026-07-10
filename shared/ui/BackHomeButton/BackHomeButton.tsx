import Link from "next/link";
import styles from "./BackHomeButton.module.css";

export default function BackHomeButton() {
  return (
    <Link href="/" className={styles.button}>
      ← Home
    </Link>
  );
}
