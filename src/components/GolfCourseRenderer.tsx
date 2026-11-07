import { useId } from "react";
import { getTerrainEdgeClasses } from "../terrainEdges";
import { PineTree } from "./icon/PineTree";
import "../styles/golf-course-renderer-var.css";
import type { GolfCourse, Point, TerrainType } from "../generator";

const WIDTH = 16;
const HEIGHT = 26;

type GolfCourseRendererProps = {
  course: GolfCourse;
  ball: Point;
  shots: Point[][];
  moveTargets: { point: Point; moves: { id: string; label: string; result: { holed: boolean } }[] }[];
  onSelectMove: (id: string) => void;
};

const TERRAIN_LABELS: Record<TerrainType, string> = {
  tee: "Tee",
  tree_p: "Pine tree",
  tree_d: "Deciduous tree",
  fairway: "Fairway",
  rough: "Rough",
  sand: "Sand trap",
  water: "Water hazard",
  hole: "Hole",
  slope_u: "Slope up",
  slope_d: "Slope down",
  slope_l: "Slope left",
  slope_r: "Slope right",
};
const GRID_DOT_TERRAIN: TerrainType[] = [
  "fairway",
  "rough",
  "sand",
  "water",
];

export function GolfCourseRenderer({
  course,
  ball,
  shots,
  moveTargets,
  onSelectMove,
}: GolfCourseRendererProps) {
  const sandPatternId = `sand-pattern-${useId().replace(/:/g, "")}`;
  return (
    <div className="golf-course-wrapper">
      <div
        className="golf-course-grid"
        role="group"
        aria-label="Golf course terrain map"
      >

        <svg
          className="sand-pattern-overlay"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id={sandPatternId}
              width="0.2"
              height="0.2"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect
                width="0.2"
                height="0.2"
                fill="var(--sand-base-color)"
              />
              <path
                d="M 0 0 V 0.2"
                stroke="var(--sand-line-color)"
                strokeWidth="0.15"
              />
            </pattern>
          </defs>

          {course.map((row, y) =>
            row.map((terrain, x) => {
              if (terrain !== "sand") return null;

              const edgeClasses = getTerrainEdgeClasses(course, x, y);
              const corners = new Set(edgeClasses.split(" "));

              const radius = 0.5;

              const tl = corners.has("corner-top-left") ? radius : 0;
              const tr = corners.has("corner-top-right") ? radius : 0;
              const br = corners.has("corner-bottom-right") ? radius : 0;
              const bl = corners.has("corner-bottom-left") ? radius : 0;

              const path = [
                `M ${x + tl} ${y}`,
                `H ${x + 1 - tr}`,
                `Q ${x + 1} ${y} ${x + 1} ${y + tr}`,
                `V ${y + 1 - br}`,
                `Q ${x + 1} ${y + 1} ${x + 1 - br} ${y + 1}`,
                `H ${x + bl}`,
                `Q ${x} ${y + 1} ${x} ${y + 1 - bl}`,
                `V ${y + tl}`,
                `Q ${x} ${y} ${x + tl} ${y}`,
                "Z",
              ].join(" ");

              return (
                <path
                  key={`sand-${x}-${y}`}
                  d={path}
                  fill={`url(#${sandPatternId})`}
                />
              );
            })
          )}
        </svg>

        {Array.from({ length: HEIGHT }, (_, y) =>
          Array.from({ length: WIDTH }, (_, x) => {
            const terrain = course[y]?.[x] ?? "rough";
            const isGridDot = GRID_DOT_TERRAIN.includes(terrain)
            const gridDotClassName = isGridDot ? "grid-dot" : "";
            return (
              <div
                key={`${x}-${y}`}
                className={[
                  `golf-cell terrain-${terrain}`,
                  getTerrainEdgeClasses(course, x, y),
                  gridDotClassName,
                ].filter(Boolean).join(" ")}
                title={`${TERRAIN_LABELS[terrain]} (${x}, ${y})`}
                aria-label={`${TERRAIN_LABELS[terrain]}, column ${x}, row ${y}`}
              >
                {/* {terrain === "sand" && <SandPattern x={x} y={y} />} */}
                
                {terrain === "tree_p" && <PineTree/>}

                {terrain === "tree_d" && (
                  <>
                    <span className="tree-shape deciduous" />
                    <span className="trunk-shape deciduous" />
                  </>
                )}

                {terrain === "tee" && (
                  <span className="tee-marker" />
                )}

                {terrain === "hole" && (
                  <span className="hole-marker" />
                )}

                {terrain.startsWith("slope_") && (
                  <span
                    className={`slope-triangle ${terrain}`}
                  />
                )}
              </div>
            );
          }),
        )}

        <svg
          className="shot-overlay"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {shots.map((shot, index) => (
            <g key={`shot-${index}`}>
              <polyline
                className="shot-line"
                points={shot.map(({ x, y }) => `${x + 0.5},${y + 0.5}`).join(" ")}
              />
              <circle
                className="landing-marker"
                cx={(shot.at(-1)?.x ?? 0) + 0.5}
                cy={(shot.at(-1)?.y ?? 0) + 0.5}
                r="0.16"
              />
            </g>
          ))}
          <circle
            className="ball-marker"
            cx={ball.x + 0.5}
            cy={ball.y + 0.5}
            r="0.29"
          />
        </svg>

        <div className="move-target-layer" role="group" aria-label="Possible landing spaces">
          {moveTargets.map(({ point, moves }) => (
            <div
              key={`${point.x}-${point.y}`}
              className="move-target-cell"
              style={{ gridColumn: point.x + 1, gridRow: point.y + 1 }}
            >
              {moves.map((move) => (
                <button
                  key={move.id}
                  className={`move-target${move.label === "P" ? " move-target-putt" : ""}${move.result.holed ? " move-target-hole" : ""}`}
                  onClick={() => onSelectMove(move.id)}
                  aria-label={move.result.holed ? `Hit ${move.label}, hole` : `Hit ${move.label} spaces, column ${point.x + 1}, row ${point.y + 1}`}
                  title={move.result.holed ? "This shot holes out" : `Hit ${move.label} spaces`}
                >
                  {move.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
