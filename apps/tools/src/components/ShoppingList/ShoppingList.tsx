"use client";

import { useMemo, useState } from "react";
import { ShoppingListEntry } from "@/lib/api";
import { formatIsk, formatNumber } from "@/lib/format";
import Button from "@/components/Button/Button";
import styles from "./ShoppingList.module.css";

type SortKey = "name" | "quantity" | "unitCost" | "subtotal" | "volumeM3";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Item" },
  { key: "quantity", label: "Qty" },
  { key: "unitCost", label: "Unit Cost" },
  { key: "subtotal", label: "Subtotal" },
  { key: "volumeM3", label: "Volume (m³)" },
];

export default function ShoppingList({ entries }: { entries: ShoppingListEntry[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("subtotal");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [copied, setCopied] = useState(false);

  const sorted = useMemo(() => {
    const copy = [...entries];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [entries, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const handleCopy = async () => {
    // "<name> <quantity>" per line - the same paste format the rest of this
    // codebase's Janice-backed tools already expect (see
    // parseItemsText.ts on the backend), so this can be pasted straight
    // into a buy order or another appraisal.
    const text = sorted.map((entry) => `${entry.name} ${entry.quantity}`).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalIsk = entries.reduce((sum, entry) => sum + entry.subtotal, 0);
  const totalVolume = entries.reduce((sum, entry) => sum + entry.volumeM3 * entry.quantity, 0);

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <span className={styles.summary}>
          {entries.length} item{entries.length === 1 ? "" : "s"} · {formatIsk(totalIsk)} ·{" "}
          {formatNumber(totalVolume)} m³
        </span>
        <Button callback={handleCopy} color="orange" disabled={entries.length === 0}>
          {copied ? "Copied!" : "Copy List"}
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className={styles.muted}>Nothing to buy - everything resolves to build.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th key={col.key} onClick={() => handleSort(col.key)} className={styles.sortable}>
                  {col.label}
                  {sortKey === col.key && (sortDir === "asc" ? " ▲" : " ▼")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry) => (
              <tr key={entry.typeId}>
                <td data-label="Item">{entry.name}</td>
                <td data-label="Qty">{formatNumber(entry.quantity)}</td>
                <td data-label="Unit Cost">{formatIsk(entry.unitCost)}</td>
                <td data-label="Subtotal">{formatIsk(entry.subtotal)}</td>
                <td data-label="Volume (m³)">{formatNumber(entry.volumeM3 * entry.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
