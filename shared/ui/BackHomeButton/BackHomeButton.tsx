import Link from "next/link";
import styles from "./BackHomeButton.module.css";

export default function BackHomeButton(props: {
  href?: string;
  label?: string;
}) {
  return (
    <Link href={props.href ?? "/"} className={styles.button}>
      {props.label ?? "← Home"}
    </Link>
  );
}
