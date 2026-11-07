import { useState } from "react";
import { generateGolfCourse } from "../generator";
import type { GolfCourse, Point, TerrainType } from "../generator";
import { GolfCourseRenderer } from "./GolfCourseRenderer";
import "./GolfCoursePage.css";

type Direction = { label: string; dx: number; dy: number };
type MoveResult = { path: Point[]; ball: Point; holed: boolean };
type AvailableMove = {
  id: string;
  label: string;
  result: MoveResult;
};
type MoveTarget = { point: Point; moves: AvailableMove[] };

const DIRECTIONS: Direction[] = [
  { label: "NW", dx: -1, dy: -1 },
  { label: "N", dx: 0, dy: -1 },
  { label: "NE", dx: 1, dy: -1 },
  { label: "W", dx: -1, dy: 0 },
  { label: "E", dx: 1, dy: 0 },
  { label: "SW", dx: -1, dy: 1 },
  { label: "S", dx: 0, dy: 1 },
  { label: "SE", dx: 1, dy: 1 },
];

const SLOPE_DIRECTIONS: Record<string, Point> = {
  slope_u: { x: 0, y: -1 },
  slope_d: { x: 0, y: 1 },
  slope_l: { x: -1, y: 0 },
  slope_r: { x: 1, y: 0 },
};

function findCell(course: GolfCourse, terrain: TerrainType): Point {
  const y = course.findIndex((row) => row.includes(terrain));
  return { x: course[y].indexOf(terrain), y };
}

function isFairway(terrain: TerrainType): boolean {
  return terrain === "tee" || terrain === "fairway" || terrain.startsWith("slope_");
}

function terrainAt(course: GolfCourse, point: Point): TerrainType | undefined {
  return course[point.y]?.[point.x];
}

function getMoveResult(
  course: GolfCourse,
  start: Point,
  direction: Direction,
  distance: number,
): MoveResult | null {
  const startTerrain = terrainAt(course, start);
  const mayCrossTrees = startTerrain !== undefined && isFairway(startTerrain);
  const path: Point[] = [start];
  let current = start;

  for (let step = 1; step <= distance; step++) {
    const next = { x: current.x + direction.dx, y: current.y + direction.dy };
    const terrain = terrainAt(course, next);
    if (!terrain) return null;
    if (terrain === "tree_p" || terrain === "tree_d") {
      if (!mayCrossTrees || step === distance) return null;
    }
    if (terrain === "hole") {
      path.push(next);
      if (step === distance || step + 1 === distance) {
        return { path, ball: next, holed: true };
      }
      current = next;
      continue;
    }
    if (terrain === "water" && step === distance) return null;
    current = next;
    path.push(current);
  }

  let ball = current;
  let landed = terrainAt(course, ball);
  const seenSlopes = new Set<string>();

  while (landed?.startsWith("slope_")) {
    const slopeDirection = SLOPE_DIRECTIONS[landed];
    if (!slopeDirection) break;
    const next = { x: ball.x + slopeDirection.x, y: ball.y + slopeDirection.y };
    const nextTerrain = terrainAt(course, next);
    if (!nextTerrain || nextTerrain === "water" || nextTerrain.startsWith("tree_")) break;
    path.push(next);
    if (nextTerrain === "hole") return { path, ball: next, holed: true };

    const nextSlopeDirection = SLOPE_DIRECTIONS[nextTerrain];
    if (
      nextSlopeDirection &&
      next.x + nextSlopeDirection.x === ball.x &&
      next.y + nextSlopeDirection.y === ball.y
    ) {
      ball = next;
      break;
    }

    const key = `${next.x},${next.y}`;
    if (seenSlopes.has(key)) break;
    seenSlopes.add(key);
    ball = next;
    landed = nextTerrain;
  }

  return { path, ball, holed: landed === "hole" };
}

export function GolfCoursePage() {
  const [course, setCourse] = useState(() => generateGolfCourse());
  const [ball, setBall] = useState(() => findCell(course, "tee"));
  const [shots, setShots] = useState<Point[][]>([]);
  const [holeNumber, setHoleNumber] = useState(1);
  const [dieRoll, setDieRoll] = useState<number | null>(null);
  const [strokes, setStrokes] = useState(0);
  const [totalStrokes, setTotalStrokes] = useState(0);
  const [mulligansUsed, setMulligansUsed] = useState(0);
  const [freeTeeReroll, setFreeTeeReroll] = useState(true);
  const [finished, setFinished] = useState(false);

  const terrain = terrainAt(course, ball) ?? "rough";
  const diceDistance = dieRoll === null
    ? null
    : Math.max(0, dieRoll + (isFairway(terrain) ? 1 : terrain === "sand" ? -1 : 0));

  function rollDie(useMulligan = false, useFreeTeeReroll = false) {
    if (useMulligan) setMulligansUsed((used) => used + 1);
    if (useFreeTeeReroll) setFreeTeeReroll(false);
    setDieRoll(Math.floor(Math.random() * 6) + 1);
  }

  function takeShot(move: AvailableMove) {
    if (finished) return;
    const { result } = move;

    setShots((previous) => [...previous, result.path]);
    setBall(result.ball);
    setStrokes((count) => count + 1);
    setTotalStrokes((count) => count + 1);
    setDieRoll(null);
    if (result.holed) {
      setFinished(true);
    }
  }

  function startNewCourse() {
    const nextCourse = generateGolfCourse();
    setCourse(nextCourse);
    setBall(findCell(nextCourse, "tee"));
    setShots([]);
    setHoleNumber(1);
    setDieRoll(null);
    setStrokes(0);
    setTotalStrokes(0);
    setMulligansUsed(0);
    setFreeTeeReroll(true);
    setFinished(false);
  }

  function startNextHole() {
    const nextCourse = generateGolfCourse();
    setCourse(nextCourse);
    setBall(findCell(nextCourse, "tee"));
    setShots([]);
    setHoleNumber((number) => number + 1);
    setDieRoll(null);
    setStrokes(0);
    setFreeTeeReroll(true);
    setFinished(false);
  }

  const tee = findCell(course, "tee");
  const atTee = ball.x === tee.x && ball.y === tee.y;
  const moveDistances = [
    ...(dieRoll === null ? [] : [{ distance: diceDistance ?? 0, label: `${diceDistance}` }]),
    ...(diceDistance === 1 ? [] : [{ distance: 1, label: "P" }]),
  ];
  const availableMoves: AvailableMove[] = moveDistances.flatMap(({ distance: moveDistance, label }) =>
    moveDistance < 1 ? [] : DIRECTIONS.flatMap((direction) => {
      const result = getMoveResult(course, ball, direction, moveDistance);
      if (!result) return [];
      return [{ id: `${label}-${direction.label}`, label, result }];
    }),
  );
  const moveTargets = Array.from(
    availableMoves.reduce((targets, move) => {
      const key = `${move.result.ball.x},${move.result.ball.y}`;
      const existing = targets.get(key);
      if (existing) {
        existing.moves.push(move);
      } else {
        targets.set(key, { point: move.result.ball, moves: [move] });
      }
      return targets;
    }, new Map<string, MoveTarget>()).values(),
  );

  return (
    <main className="golf-game">
      <header className="game-header">
        <div>
          <p className="eyebrow">PAPER GOLF / 18-HOLE COURSE</p>
          <h1>Hole {holeNumber}</h1>
        </div>
        <button className="new-course-button" onClick={startNewCourse}>New course</button>
      </header>

      <div className="game-layout">
        <section className="course-section" aria-label="Golf course">
          <div className="course-layout">
            <GolfCourseRenderer
              course={course}
              ball={ball}
              shots={shots}
              moveTargets={finished ? [] : moveTargets}
              onSelectMove={(id) => {
                const move = availableMoves.find((candidate) => candidate.id === id);
                if (move) takeShot(move);
              }}
            />
            <aside className="course-rail" aria-label="Terrain key and dice">
              <div className="terrain-key" aria-label="Terrain key">
                <span><i className="terrain-key-swatch terrain-rough" />Rough</span>
                <span><i className="terrain-key-swatch terrain-fairway" />Fairway</span>
                <span><i className="terrain-key-swatch terrain-sand" />Sand</span>
                <span><i className="terrain-key-swatch terrain-water" />Water</span>
                <span><i className="terrain-key-swatch terrain-slope_l"><b /></i>Slope</span>
              </div>
              <div className="dice-control">
                <div className="dice-actions">
                  {finished && holeNumber < 18 && (
                    <button className="next-hole-button" onClick={startNextHole}>Next hole</button>
                  )}
                  {dieRoll !== null && freeTeeReroll && strokes === 0 && atTee && (
                    <button className="text-action" onClick={() => rollDie(false, true)}>Free roll</button>
                  )}
                  {dieRoll !== null && mulligansUsed < 6 && (
                    <button className="text-action" onClick={() => rollDie(true)}>Use mulligan</button>
                  )}
                </div>
                <button
                  className={`die-button${dieRoll === null ? " die-button-empty" : ""}`}
                  onClick={() => { if (dieRoll === null && !finished) rollDie(); }}
                  disabled={dieRoll !== null || finished}
                  aria-label={dieRoll === null ? "Roll the die" : `Die shows ${dieRoll}`}
                  title={dieRoll === null ? "Click to roll" : `Roll: ${dieRoll}`}
                >
                  {dieRoll ?? "Roll"}
                </button>
              </div>
            </aside>
            <div className="course-scoreline" aria-label={`Hole ${holeNumber}, ${mulligansUsed} of 6 mulligans used, ${strokes} of 6 strokes, ${totalStrokes} total strokes`}>
              <span>Hole</span><strong>{holeNumber}</strong>
              <span>Mulligan</span><strong>{mulligansUsed}/6</strong>
              <span>Strokes:</span><strong>{strokes}/6</strong>
              <span>Total:</span><strong>{totalStrokes}</strong>
            </div>
          </div>
          {finished && holeNumber === 18 && (
            <p className="course-complete" aria-live="polite">18 holes complete · {totalStrokes} strokes</p>
          )}
        </section>
      </div>
    </main>
  );
}