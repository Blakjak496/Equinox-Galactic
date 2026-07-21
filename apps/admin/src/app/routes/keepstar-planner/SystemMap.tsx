import {
  KeepstarMapBounds,
  KeepstarMapPoint,
  KeepstarMapSystem,
} from "@/lib/api";
import styles from "./SystemMap.module.css";

type Props = {
  bounds: KeepstarMapBounds;
  systems: KeepstarMapSystem[];
  routePath: KeepstarMapPoint[];
};

// EVE community convention for a 2D starmap projection: drop y, plot x/z -
// the galaxy's disc-shaped spread is dominant on those two axes. Unverified
// against the in-game map in this environment (no live ESI/position data to
// check against) - if the shape looks rotated or mirrored once you compare
// it, that's a one-line axis/sign swap here, not a rebuild.
function securityColor(securityStatus: number | null): string {
  if (securityStatus === null) return "#666666";
  if (securityStatus >= 0.5) return "#4caf50";
  if (securityStatus > 0.0) return "#e0a030";
  return "#e05252";
}

// In-game-style arc rather than a straight line: each leg is a quadratic
// Bezier whose control point is offset perpendicular to the straight line
// between the two waypoints, bulging it outward. Offset is a fraction of
// that leg's own length (not the whole map's span), so short and long hops
// arc with the same proportional curvature. Points are already in SVG space
// (y = -z) by the time this runs.
function buildArcPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";

  const ARC_FACTOR = 0.18;
  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    // Perpendicular to (dx, dy), consistently rotated the same way each leg
    // so the whole path arcs with one continuous twist rather than a zigzag.
    const controlX = midX - dy * ARC_FACTOR;
    const controlY = midY + dx * ARC_FACTOR;
    d += ` Q ${controlX} ${controlY} ${b.x} ${b.y}`;
  }

  return d;
}

export default function SystemMap({ bounds, systems, routePath }: Props) {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxZ - bounds.minZ;
  const spanLY = Math.max(width, height, 1);

  const dotRadius = spanLY * 0.012;
  const routeDotRadius = spanLY * 0.02;
  const fontSize = spanLY * 0.022;

  // SVG y grows downward, so world z is negated when plotting - "up" in the
  // rendered map corresponds to increasing z.
  const viewBox = `${bounds.minX} ${-bounds.maxZ} ${width} ${height}`;

  const pathD = buildArcPath(routePath.map((p) => ({ x: p.x, y: -p.z })));

  return (
    <div className={styles.wrapper}>
      <svg
        className={styles.map}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
      >
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={spanLY * 0.004}
          />
        )}

        {systems.map((system) => {
          const showLabel = system.isOnRoute || system.keepstarName !== null;
          return (
            <g key={system.systemId}>
              <circle
                cx={system.x}
                cy={-system.z}
                r={system.isOnRoute ? routeDotRadius : dotRadius}
                fill={
                  system.isOnRoute
                    ? "var(--primary)"
                    : securityColor(system.securityStatus)
                }
                stroke={system.keepstarName ? "#ffffff" : "none"}
                strokeWidth={system.keepstarName ? spanLY * 0.003 : 0}
              />
              {showLabel && (
                <text
                  x={system.x}
                  y={-system.z - routeDotRadius - fontSize * 0.4}
                  fontSize={fontSize}
                  textAnchor="middle"
                  fill="var(--text)"
                >
                  {system.name}
                  {system.keepstarName ? ` (${system.keepstarName})` : ""}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span
            className={styles.legendDot}
            style={{ background: "var(--primary)" }}
          />
          On route
        </span>
        <span className={styles.legendItem}>
          <span
            className={styles.legendDot}
            style={{ background: securityColor(0.6) }}
          />
          High-sec
        </span>
        <span className={styles.legendItem}>
          <span
            className={styles.legendDot}
            style={{ background: securityColor(0.3) }}
          />
          Low-sec
        </span>
        <span className={styles.legendItem}>
          <span
            className={styles.legendDot}
            style={{ background: securityColor(0) }}
          />
          Null-sec
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.legendDotRinged}`} />
          Known Keepstar
        </span>
      </div>
    </div>
  );
}
