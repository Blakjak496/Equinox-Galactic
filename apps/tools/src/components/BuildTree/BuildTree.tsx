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

const BADGE_CLASS: Record<BuildTreeNode["decision"], string> = {
  build: "badgeBuild",
  buy: "badgeBuy",
  pooled: "badgePooled",
  hybrid: "badgeHybrid",
};

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
        <span className={`${styles.badge} ${styles[BADGE_CLASS[node.decision]]}`}>{node.decision}</span>
        <span className={styles.name}>{node.name}</span>
        <span className={styles.qty}>
          {formatNumber(node.quantity)}
          {node.decision === "hybrid" && node.buyQuantity !== undefined && (
            <span className={styles.qtyDetail}>
              {formatNumber(node.quantity - node.buyQuantity)} built + {formatNumber(node.buyQuantity)} bought
            </span>
          )}
          {node.decision === "pooled" && node.poolBuildQuantity !== undefined && node.poolBuyQuantity !== undefined && (
            <span className={styles.qtyDetail}>
              shared batch: {formatNumber(node.poolBuildQuantity)} built + {formatNumber(node.poolBuyQuantity)} bought
              {" "}({formatNumber(node.poolTotalQuantity ?? 0)} total)
            </span>
          )}
        </span>
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
