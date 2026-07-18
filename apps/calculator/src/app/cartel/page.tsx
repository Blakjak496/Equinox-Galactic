import Link from "next/link";
import BackHomeButton from "@shared/ui/BackHomeButton/BackHomeButton";
import styles from "./page.module.css";

export default function Cartel() {
  return (
    <div className={styles.page}>
      <BackHomeButton />
      <div className={styles.bannerWrapper}>
        <img src="/crest.png" alt="Equinox crest" className={styles.crest} />
        <span className={styles.wordmark}>
          Equinox
          <br />
          Cartel
        </span>
      </div>

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
