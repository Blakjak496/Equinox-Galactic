"use client";

import Button from "../Button/Button";
import NavItem from "./components/NavItem/NavItem";
import styles from "./Sidebar.module.css";
import { UserCredential } from "firebase/auth";

type Props = {
  activePage: string;
  signedIn: boolean;
  login: () => Promise<UserCredential>;
  logout: () => Promise<void>;
};

export default function Sidebar({
  activePage,
  signedIn,
  login,
  logout,
}: Props) {
  const navigate = (toPage: string) => {};

  return (
    <div className={styles.sidebar}>
      {signedIn && (
        <div className={styles.sidebarContent}>
          <NavItem
            name="Dashboard"
            callback={() => navigate("dashboard")}
            active={activePage === "dashboard"}
          />
          <NavItem
            name="Analytics"
            callback={() => navigate("analytics")}
            active={activePage === "analytics"}
          />
          <NavItem
            name="Settings"
            callback={() => navigate("settings")}
            active={activePage === "settings"}
          />
        </div>
      )}
      {signedIn ? (
        <div className={styles.signoutWrapper}>
          <Button callback={() => logout()} color="red">
            Logout
          </Button>
        </div>
      ) : (
        <div className={styles.signinWrapper}>
          <Button callback={() => login()} color="red">
            Login
          </Button>
        </div>
      )}
    </div>
  );
}
