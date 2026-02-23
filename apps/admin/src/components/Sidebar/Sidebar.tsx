"use client";

import Button from "../Button/Button";
import NavItem from "./components/NavItem/NavItem";
import styles from "./Sidebar.module.css";
import { UserCredential } from "firebase/auth";
import { startEveSso } from "@/lib/eveSso";
import { usePathname } from "next/navigation";

type Props = {
  signedIn: boolean;
  login: () => Promise<UserCredential>;
  logout: () => Promise<void>;
};

export default function Sidebar({ signedIn, login, logout }: Props) {
  const pathname = usePathname();
  return (
    <div className={styles.sidebar}>
      {signedIn && (
        <div className={styles.sidebarContent}>
          <NavItem active={pathname === "/dashboard"} route="/dashboard">
            Dashboard
          </NavItem>
          <NavItem active={pathname === "/runs"} route="/runs">
            Runs
          </NavItem>
          <NavItem active={pathname === "/analytics"} route="/analytics">
            Analytics
          </NavItem>
          <NavItem active={pathname === "/settings"} route="/settings">
            Settings
          </NavItem>
        </div>
      )}
      <div className={styles.buttons}>
        {signedIn ? (
          [
            <Button key={0} callback={() => startEveSso()} color="orange">
              Eve SSO
            </Button>,
            <Button key={1} callback={() => logout()} color="red">
              Logout
            </Button>,
          ]
        ) : (
          <Button callback={() => login()} color="red">
            Login
          </Button>
        )}
      </div>
    </div>
  );
}
