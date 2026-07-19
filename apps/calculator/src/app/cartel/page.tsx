"use client";

import Link from "next/link";
import { useLocale } from "@/lib/LocaleContext";
import styles from "./page.module.css";

export default function Cartel() {
  const { t } = useLocale();

  return (
    <div className={styles.page}>
      <div className={styles.tiles}>
        <Link href="/cartel/buyback" className={styles.tile}>
          <span className={styles.tileTitle}>
            {t("cartelTileBuybackTitle")}
          </span>
          <span className={styles.tileSubtitle}>
            {t("cartelTileBuybackSubtitle")}
          </span>
        </Link>
        <Link href="/cartel/purchase" className={styles.tile}>
          <span className={styles.tileTitle}>
            {t("cartelTileStockTitle")}
          </span>
          <span className={styles.tileSubtitle}>
            {t("cartelTileStockSubtitle")}
          </span>
        </Link>
      </div>
    </div>
  );
}
