"use client";

import Link from "next/link";
import styles from "./NavItem.module.css";
import { ReactNode } from "react";

type Props = {
  route: string;
  active: boolean;
  children: ReactNode;
};

export default function NavItem({ route, active, children }: Props) {
  return (
    <Link
      href={route}
      className={`${styles.navItem} ${active ? styles.active : ""}`}
    >
      {children}
    </Link>
  );
}
