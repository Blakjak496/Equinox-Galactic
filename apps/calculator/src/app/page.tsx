"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getPublicConfig, PublicConfig } from "./api/config";
import styles from "./page.module.css";

// This app is a static export (no Node server at runtime), so the service
// toggle can't be checked server-side per-request - it's fetched client-side
// on mount instead, same as every other data fetch in this app.
const DEFAULT_CONFIG: PublicConfig = {
  runnersEnabled: true,
  cartelEnabled: true,
};

export default function Home() {
  const [config, setConfig] = useState<PublicConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    getPublicConfig()
      .then(setConfig)
      .catch(() => {});
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.tiles}>
        {config.runnersEnabled ? (
          <Link href="/runners" className={styles.tile}>
            <span className={styles.tileTitle}>Equinox Runners</span>
            <span className={styles.tileSubtitle}>Hauling Quotes</span>
          </Link>
        ) : (
          <div className={`${styles.tile} ${styles.tileDisabled}`}>
            <span className={styles.tileTitle}>Equinox Runners</span>
            <span className={styles.tileSubtitle}>Hauling Quotes</span>
            <div className={styles.tileOverlay}>
              <span className={styles.tileOverlayText}>
                Not Currently In Service
              </span>
            </div>
          </div>
        )}
        {config.cartelEnabled ? (
          <Link href="/cartel" className={styles.tile}>
            <span className={styles.tileTitle}>Equinox Cartel</span>
            <span className={styles.tileSubtitle}>Buyback Quotes</span>
          </Link>
        ) : (
          <div className={`${styles.tile} ${styles.tileDisabled}`}>
            <span className={styles.tileTitle}>Equinox Cartel</span>
            <span className={styles.tileSubtitle}>Buyback Quotes</span>
            <div className={styles.tileOverlay}>
              <span className={styles.tileOverlayText}>
                Not Currently In Service
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
