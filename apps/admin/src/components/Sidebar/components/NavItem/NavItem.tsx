"use client";

import Link from "next/link";
import styles from "./NavItem.module.css";
import { ReactNode } from "react";

type Props = {
  route: string;
  active: boolean;
  children: ReactNode;
  onClick: () => void;
};

export default function NavItem({ route, active, children, onClick }: Props) {
  return (
    <Link
      href={route}
      className={`${styles.navItem} ${active ? styles.active : ""}`}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
