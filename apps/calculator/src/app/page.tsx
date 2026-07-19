"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getPublicConfig, PublicConfig } from "./api/config";
import { useLocale } from "@/lib/LocaleContext";
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
  const { t } = useLocale();

  useEffect(() => {
    getPublicConfig()
      .then(setConfig)
      .catch(() => {});
  }, []);

  const runnersTitle = `${t("brandEquinox")} ${t("navRunners")}`;
  const cartelTitle = `${t("brandEquinox")} ${t("navCartel")}`;

  return (
    <div className={styles.page}>
      <div className={styles.tiles}>
        {config.runnersEnabled ? (
          <Link href="/runners" className={styles.tile}>
            <span className={styles.tileTitle}>{runnersTitle}</span>
            <span className={styles.tileSubtitle}>
              {t("homeRunnersSubtitle")}
            </span>
          </Link>
        ) : (
          <div className={`${styles.tile} ${styles.tileDisabled}`}>
            <span className={styles.tileTitle}>{runnersTitle}</span>
            <span className={styles.tileSubtitle}>
              {t("homeRunnersSubtitle")}
            </span>
            <div className={styles.tileOverlay}>
              <span className={styles.tileOverlayText}>
                {t("serviceUnavailableTitle")}
              </span>
            </div>
          </div>
        )}
        {config.cartelEnabled ? (
          <Link href="/cartel" className={styles.tile}>
            <span className={styles.tileTitle}>{cartelTitle}</span>
            <span className={styles.tileSubtitle}>
              {t("homeCartelSubtitle")}
            </span>
          </Link>
        ) : (
          <div className={`${styles.tile} ${styles.tileDisabled}`}>
            <span className={styles.tileTitle}>{cartelTitle}</span>
            <span className={styles.tileSubtitle}>
              {t("homeCartelSubtitle")}
            </span>
            <div className={styles.tileOverlay}>
              <span className={styles.tileOverlayText}>
                {t("serviceUnavailableTitle")}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
