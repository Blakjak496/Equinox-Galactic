"use client";

import { ReactNode } from "react";
import TopBar from "@/components/TopBar/TopBar";
import Sidebar from "@/components/Sidebar/Sidebar";
import styles from "./AppShell.module.css";
import { UserCredential } from "firebase/auth";

type Props = {
  activePage: string;
  signedIn: boolean;
  login: () => Promise<UserCredential>;
  logout: () => Promise<void>;
  children: ReactNode;
};

export default function AppShell({
  activePage,
  signedIn,
  login,
  logout,
  children,
}: Props) {
  return (
    <div className={`starfield-overlay ${styles.shell}`}>
      <TopBar />
      <Sidebar
        activePage={activePage}
        login={login}
        signedIn={signedIn}
        logout={logout}
      />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
