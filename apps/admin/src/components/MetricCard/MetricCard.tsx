"use client";

import Panel from "../Panel/Panel";
import styles from "./MetricCard.module.css";

type Props = {
  name: string;
  value: string | number;
};

export default function MetricCard({ name, value }: Props) {
  return (
    <div className={styles.wrapper}>
      <Panel>
        <div className={styles.name}>
          <span>{name}</span>
        </div>
        <div className={styles.value}>{value.toLocaleString()}</div>
      </Panel>
    </div>
  );
}
