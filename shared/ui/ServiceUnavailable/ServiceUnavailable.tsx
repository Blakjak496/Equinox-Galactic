import Card from "../Card/Card";
import BackHomeButton from "../BackHomeButton/BackHomeButton";
import styles from "./ServiceUnavailable.module.css";

export default function ServiceUnavailable(props: { serviceName: string }) {
  return (
    <div className={styles.page}>
      <Card>
        <div className={styles.content}>
          <span className={styles.title}>Not Currently In Service</span>
          <span className={styles.body}>
            {props.serviceName} isn&apos;t available right now. Please check
            back later.
          </span>
        </div>
      </Card>
      <BackHomeButton />
    </div>
  );
}
