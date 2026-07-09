import Card from "@/components/ui/Card/Card";
import styles from "./page.module.css";

export default function RegisterComplete() {
  return (
    <div className={styles.page}>
      <div className={styles.bannerWrapper}>
        <img
          src="/banner-logo.png"
          alt="Equinox Galactic Banner Logo"
          className={styles.bannerLogo}
        />
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
