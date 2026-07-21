import {
  KeepstarMapBounds,
  KeepstarMapPoint,
  KeepstarMapRegion,
  KeepstarMapSystem,
} from "@/lib/api";
import styles from "./SystemMap.module.css";

type Props = {
  bounds: KeepstarMapBounds;
  systems: KeepstarMapSystem[];
  routePath: KeepstarMapPoint[];
  regions: KeepstarMapRegion[];
};

// EVE community convention for a 2D starmap projection: drop y, plot x/z -
// the galaxy's disc-shaped spread is dominant on those two axes. Unverified
// against the in-game map in this environment (no live ESI/position data to
// check against) - if the shape looks rotated or mirrored once you compare
// it, that's a one-line axis/sign swap here, not a rebuild.

// Deterministic regionId -> hue via the golden angle, not a plain modulo -
// EVE region IDs are sequential and often spatially adjacent, so a naive
// `id % 360` would give neighboring regions near-identical, hard-to-tell-
// apart colors. Multiplying by the golden angle spreads consecutive
// integers around the hue circle instead of clustering them.
function regionColor(regionId: number | null): string {
  if (regionId === null) return "#666666";
  const hue = (regionId * 137.508) % 360;
  return `hsl(${hue}, 65%, 60%)`;
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

// The structure's actual in-game name commonly already has the system name
// baked in as a prefix (an owner naming convention, not something this app
// controls) - e.g. "1DQ1-A - Keepstar". Prepending the system name again
// unconditionally produced "1DQ1-A (1DQ1-A - Keepstar)". Only prepend it
// when the keepstar name doesn't already start with it.
function buildLabel(system: KeepstarMapSystem): string {
  if (!system.keepstarName) return system.name;
  if (system.keepstarName.startsWith(system.name)) return system.keepstarName;
  return `${system.name} (${system.keepstarName})`;
}

// Percentage position within the bounding box, matching the SVG arc's own
// (x, -z) flip below - world "up" (+z) reads as visually up.
function positionPercent(
  x: number,
  z: number,
  bounds: KeepstarMapBounds,
): { left: string; top: string } {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxZ - bounds.minZ;
  const left = ((x - bounds.minX) / width) * 100;
  const top = ((bounds.maxZ - z) / height) * 100;
  return { left: `${left}%`, top: `${top}%` };
}

export default function SystemMap({ bounds, systems, routePath, regions }: Props) {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxZ - bounds.minZ;

  // SVG y grows downward, so world z is negated when plotting - "up" in the
  // rendered map corresponds to increasing z. This is the arc line only now
  // - dots and labels are plain HTML positioned by percentage (see below),
  // so their size is real, fixed CSS pixels regardless of how big or small
  // this container ends up being on a given device. Sizing dots/text as a
  // fraction of the SVG's own coordinate span (the previous approach)
  // mathematically cancels out to "a fraction of the container's pixel
  // width" - fine on one specific screen size, wrong on every other one
  // (huge on a wide desktop panel, needlessly tiny on a narrow phone).
  const viewBox = `${bounds.minX} ${-bounds.maxZ} ${width} ${height}`;
  const pathD = buildArcPath(routePath.map((p) => ({ x: p.x, y: -p.z })));

  // Painted in layers so the route itself is never buried under the scatter
  // of unrelated nearby systems: background dots at the bottom, the route
  // arc above them, on-route dots/labels on top of everything.
  const backgroundSystems = systems.filter((s) => !s.isOnRoute);
  const routeSystems = systems.filter((s) => s.isOnRoute);

  return (
    <div className={styles.wrapper}>
      <div className={styles.map}>
        <svg
          className={styles.arcLayer}
          viewBox={viewBox}
          preserveAspectRatio="none"
        >
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {backgroundSystems.map((system) => {
          const pos = positionPercent(system.x, system.z, bounds);
          return (
            <div key={system.systemId} className={styles.marker} style={pos}>
              <span
                className={styles.dot}
                style={{
                  background: regionColor(system.regionId),
                  boxShadow: system.keepstarName
                    ? "0 0 0 1.5px #ffffff"
                    : "none",
                }}
              />
              {system.keepstarName && (
                <span className={styles.label}>{buildLabel(system)}</span>
              )}
            </div>
          );
        })}

        {regions.map((region) => {
          const pos = positionPercent(region.x, region.z, bounds);
          return (
            <div
              key={region.regionId}
              className={styles.regionLabel}
              style={{ ...pos, color: regionColor(region.regionId) }}
            >
              {region.name}
            </div>
          );
        })}

        {routeSystems.map((system) => {
          const pos = positionPercent(system.x, system.z, bounds);
          return (
            <div
              key={system.systemId}
              className={`${styles.marker} ${styles.markerOnRoute}`}
              style={pos}
            >
              <span
                className={`${styles.dot} ${styles.dotOnRoute}`}
                style={{
                  boxShadow: system.keepstarName
                    ? "0 0 0 1.5px #ffffff"
                    : "none",
                }}
              />
              <span className={styles.label}>{buildLabel(system)}</span>
            </div>
          );
        })}
      </div>

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span
            className={styles.legendDot}
            style={{ background: "var(--primary)" }}
          />
          On route
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.legendDotRinged}`} />
          Known Keepstar
        </span>
        <span className={styles.legendItem}>
          Dot color = region (see labels on map)
        </span>
      </div>
    </div>
  );
}
