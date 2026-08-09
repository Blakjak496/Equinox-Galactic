"use client";

import { useState } from "react";
import { BuildTreeNode } from "@/lib/api";
import { formatIsk, formatNumber } from "@/lib/format";
import IconButton from "@/components/IconButton/IconButton";
import styles from "./BuildTree.module.css";

// Rows below this depth start collapsed - the target item and its direct
// materials (depth 0/1) are visible immediately, deeper sub-components
// need an explicit expand, per the brief's layout notes.
const AUTO_EXPAND_DEPTH = 2;

export default function BuildTree({ root }: { root: BuildTreeNode }) {
  return (
    <div className={styles.tree}>
      <div className={styles.headerRow}>
        <span className={styles.colName}>Item</span>
        <span className={styles.colQty}>Qty</span>
        <span className={styles.colUnit}>Unit Cost</span>
        <span className={styles.colSubtotal}>Subtotal</span>
      </div>
      <BuildTreeRow node={root} depth={0} />
    </div>
  );
}

function BuildTreeRow({ node, depth }: { node: BuildTreeNode; depth: number }) {
  const hasChildren = Boolean(node.children && node.children.length > 0);
  const [expanded, setExpanded] = useState(depth < AUTO_EXPAND_DEPTH);

  return (
    <div>
      <div className={styles.row} style={{ paddingLeft: `${depth * 1.25}rem` }}>
        {hasChildren ? (
          <IconButton
            icon={expanded ? "up" : "down"}
            ariaLabel={expanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
            callback={() => setExpanded((e) => !e)}
            color="blue"
          />
        ) : (
          <span className={styles.spacer} />
        )}
        <span className={`${styles.badge} ${node.decision === "build" ? styles.badgeBuild : styles.badgeBuy}`}>
          {node.decision}
        </span>
        <span className={styles.name}>{node.name}</span>
        <span className={styles.qty}>{formatNumber(node.quantity)}</span>
        <span className={styles.unit}>{formatIsk(node.unitCost)}</span>
        <span className={styles.subtotal}>{formatIsk(node.subtotal)}</span>
      </div>
      {hasChildren && expanded && (
        <div>
          {node.children!.map((child, index) => (
            <BuildTreeRow key={`${child.typeId}-${depth}-${index}`} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
