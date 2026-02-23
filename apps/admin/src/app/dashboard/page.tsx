"use client";

import styles from "./Dashboard.module.css";
import { User } from "firebase/auth";

type Props = {
  user: User | null;
};
export default function Dashboard() {
  // if (user && user.email !== "blakjak9462@gmail.com") {
  //   return (
  //     <div className="starfield-overlay" style={{ padding: 24 }}>
  //       Access denied.
  //     </div>
  //   );
  // }
  return <div className={styles.container}></div>;
}
