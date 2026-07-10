import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <div className={styles.bannerWrapper}>
        <img src="/crest.png" alt="Equinox crest" className={styles.crest} />
        <span className={styles.wordmark}>
          Equinox
          <br />
          Galactic
        </span>
      </div>

      <div className={styles.tiles}>
        <Link href="/hauling" className={styles.tile}>
          <span className={styles.tileTitle}>Equinox Runners</span>
          <span className={styles.tileSubtitle}>Hauling Quotes</span>
        </Link>
        <Link href="/buyback" className={styles.tile}>
          <span className={styles.tileTitle}>Equinox Cartel</span>
          <span className={styles.tileSubtitle}>Buyback Quotes</span>
        </Link>
      </div>
    </div>
  );
}
