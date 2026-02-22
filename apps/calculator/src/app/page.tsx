import styles from "./page.module.css";
import Dashboard from "./pages/dashboard/page";

export default function Home() {
  return (
    <div className={styles.page}>
      <Dashboard />
    </div>
  );
}
