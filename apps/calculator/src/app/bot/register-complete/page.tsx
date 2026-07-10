import Card from "@shared/ui/Card/Card";
import styles from "./page.module.css";

export default function RegisterComplete() {
  return (
    <div className={styles.page}>
      <div className={styles.bannerWrapper}>
        <img src="/crest.png" alt="Equinox crest" className={styles.crest} />
        <span className={styles.wordmark}>
          Equinox
          <br />
          Runners
        </span>
      </div>
      <div className={styles.content}>
        <Card
          mainTitle="Registration Complete"
          subtitle="You have successfully registered with Equinox Bot. You can now close this page and return to discord."
        ></Card>
      </div>
    </div>
  );
}
