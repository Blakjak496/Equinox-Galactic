"use client";

import Card from "../Card/Card";
import BackHomeButton from "../BackHomeButton/BackHomeButton";
import { useLocale } from "@/lib/LocaleContext";
import styles from "./ServiceUnavailable.module.css";

export default function ServiceUnavailable(props: { serviceName: string }) {
  const { t } = useLocale();

  return (
    <div className={styles.page}>
      <Card>
        <div className={styles.content}>
          <span className={styles.title}>
            {t("serviceUnavailableTitle")}
          </span>
          <span className={styles.body}>
            {t("serviceUnavailableBody", { service: props.serviceName })}
          </span>
        </div>
      </Card>
      <BackHomeButton />
    </div>
  );
}
