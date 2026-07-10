"use client";

import Button from "../Button/Button";
import NavItem from "./components/NavItem/NavItem";
import styles from "./Sidebar.module.css";
import { UserCredential } from "firebase/auth";
import { startEveSso } from "@/lib/eveSso";
import { usePathname } from "next/navigation";
import BurgerMenu from "../BurgerMenu/BurgerMenu";
import { useState } from "react";

type Props = {
  signedIn: boolean;
  login: () => Promise<UserCredential>;
  logout: () => Promise<void>;
};

export default function Sidebar({ signedIn, login, logout }: Props) {
  const [open, setOpen] = useState<boolean>(false);

  const pathname = usePathname();

  return [
    <BurgerMenu key={0} open={open} onClick={() => setOpen(!open)} />,
    <div key={1} className={`${styles.sidebar} ${open ? styles.open : ""}`}>
      <div className={styles.brandTab}>
        <img className={styles.crest} src="/crest.png" alt="Equinox Galactic crest" />
        <span className={styles.wordmark}>
          Equinox
          <br />
          Galactic
        </span>
      </div>
      {signedIn && (
        <div className={styles.sidebarContent}>
          <NavItem
            active={pathname === "/dashboard"}
            route="/dashboard"
            onClick={() => setOpen(false)}
          >
            Dashboard
          </NavItem>
          <NavItem
            active={pathname === "/routes"}
            route="/routes"
            onClick={() => setOpen(false)}
          >
            Routes
          </NavItem>
          <NavItem
            active={pathname === "/main-routes"}
            route="/main-routes"
            onClick={() => setOpen(false)}
          >
            Main Routes
          </NavItem>
          <NavItem
            active={pathname === "/ship-categories"}
            route="/ship-categories"
            onClick={() => setOpen(false)}
          >
            Ship Categories
          </NavItem>
          <NavItem
            active={pathname === "/jump-planner"}
            route="/jump-planner"
            onClick={() => setOpen(false)}
          >
            Jump Planner
          </NavItem>
          <NavItem
            active={pathname === "/buyback-categories"}
            route="/buyback-categories"
            onClick={() => setOpen(false)}
          >
            Buyback Items
          </NavItem>
          <NavItem
            active={pathname === "/buyback-quotes"}
            route="/buyback-quotes"
            onClick={() => setOpen(false)}
          >
            Buyback Quotes
          </NavItem>
          <NavItem
            active={pathname === "/settings"}
            route="/settings"
            onClick={() => setOpen(false)}
          >
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
    </div>,
  ];
}
