"use client";

import Panel from "../Panel/Panel";
import styles from "./MetricCard.module.css";

export default function MetricCard(props: {
  name: string;
  value: string | number;
}) {
  return (
    <Panel>
      <div className={styles.name}>
        <h3>{props.name}</h3>
      </div>
      <div className={styles.value}>{props.value}</div>
    </Panel>
  );
}
