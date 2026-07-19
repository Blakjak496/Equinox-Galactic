import Link from "next/link";
import styles from "./page.module.css";

export default function Cartel() {
  return (
    <div className={styles.page}>
      <div className={styles.tiles}>
        <Link href="/cartel/buyback" className={styles.tile}>
          <span className={styles.tileTitle}>Buyback</span>
          <span className={styles.tileSubtitle}>Sell items</span>
        </Link>
        <Link href="/cartel/purchase" className={styles.tile}>
          <span className={styles.tileTitle}>Purchase Stock</span>
          <span className={styles.tileSubtitle}>Buy items</span>
        </Link>
      </div>
    </div>
  );
}
