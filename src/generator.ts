
export type TerrainType =
  | "tee"
  | "tree_p"
  | "tree_d"
  | "fairway"
  | "rough"
  | "sand"
  | "water"
  | "hole"
  | "slope_u"
  | "slope_d"
  | "slope_l"
  | "slope_r";
export type GolfCourse = TerrainType[][];

export type Point = {
  x: number;
  y: number;
};

const WIDTH = 16;
const HEIGHT = 26;

const SLOPE_TYPES = [
  "slope_u",
  "slope_d",
  "slope_l",
  "slope_r",
] as const;

type SlopeType = (typeof SLOPE_TYPES)[number];

// Seeded random generator for reproducible courses.
function createRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state += 0x6D2B79F5;

    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(
  min: number,
  max: number,
  random: () => number,
): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createEmptyCourse(): GolfCourse {
  return Array.from(
    { length: HEIGHT },
    () => Array<TerrainType>(WIDTH).fill("rough"),
  );
}

// Paint an irregular, approximately elliptical shape.
// Only rough cells are replaced, so existing features are preserved.
function paintBlob(
  course: GolfCourse,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  terrain: TerrainType | (() => TerrainType),
  random: () => number,
): void {
  const minX = Math.max(0, centerX - radiusX);
  const maxX = Math.min(WIDTH - 1, centerX + radiusX);
  const minY = Math.max(0, centerY - radiusY);
  const maxY = Math.min(HEIGHT - 1, centerY + radiusY);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (course[y][x] !== "rough") {
        continue;
      }

      const dx = (x - centerX) / radiusX;
      const dy = (y - centerY) / radiusY;
      const distance = dx * dx + dy * dy;

      // Randomize the boundary to avoid perfect circles.
      const boundary = 0.75 + random() * 0.5;

      if (distance <= boundary) {
        course[y][x] =
          typeof terrain === "function" ? terrain() : terrain;
      }
    }
  }
}

// Add a hazard near a fairway feature.
function addHazard(
  course: GolfCourse,
  target: Point,
  offsetX: number,
  offsetY: number,
  radiusX: number,
  radiusY: number,
  terrain: "sand" | "water",
  random: () => number,
): void {
  paintBlob(
    course,
    clamp(target.x + offsetX, 1, WIDTH - 2),
    clamp(target.y + offsetY, 3, HEIGHT - 4),
    radiusX,
    radiusY,
    terrain,
    random,
  );
}

export function generateGolfCourse(seed = Date.now()): GolfCourse {
  const random = createRandom(seed);
  const course = createEmptyCourse();

  const tee: Point = {
    x: randomInt(4, 11, random),
    y: HEIGHT - 2,
  };

  const hole: Point = {
    x: randomInt(4, 11, random),
    y: 2,
  };

  // Track fairway centers to guide hazard placement.
  const fairwayCenters: Point[] = [];

  // 1. Create the tee area.
  paintBlob(
    course,
    tee.x,
    tee.y,
    2,
    2,
    "fairway",
    random,
  );

  fairwayCenters.push(tee);

  // 2. Create the fairway area around the hole.
  // This also provides the area where slopes can appear.
  paintBlob(
    course,
    hole.x,
    hole.y,
    3,
    2,
    "fairway",
    random,
  );

  fairwayCenters.push(hole);

  // 3. Generate independent fairway patches through the middle.
  // These patches do not have to connect to each other.
  const patchCount = randomInt(2, 3, random);
  let centerX = randomInt(3, 12, random);

  for (let i = 0; i < patchCount; i++) {
    const centerY = Math.round(
      7 + (i * 12) / (patchCount - 1),
    );

    // Let the fairway wander horizontally.
    centerX = clamp(
      centerX + randomInt(-4, 4, random),
      2,
      WIDTH - 3,
    );

    const center: Point = {
      x: centerX,
      y: centerY,
    };

    paintBlob(
      course,
      center.x,
      center.y,
      randomInt(2, 4, random),
      randomInt(2, 3, random),
      "fairway",
      random,
    );

    fairwayCenters.push(center);
  }

  // 4. Add sand traps near fairway patches.
  const sandCount = randomInt(2, 4, random);

  for (let i = 0; i < sandCount; i++) {
    const target =
      fairwayCenters[randomInt(0, fairwayCenters.length - 1, random)];

    addHazard(
      course,
      target,
      randomInt(-4, 4, random),
      randomInt(-3, 3, random),
      randomInt(1, 2, random),
      randomInt(1, 2, random),
      "sand",
      random,
    );
  }

  // 5. Add water hazards.
  const waterCount = randomInt(1, 2, random);

  for (let i = 0; i < waterCount; i++) {
    const target =
      fairwayCenters[randomInt(0, fairwayCenters.length - 1, random)];

    addHazard(
      course,
      target,
      randomInt(-5, 5, random),
      randomInt(-3, 3, random),
      randomInt(2, 4, random),
      randomInt(2, 4, random),
      "water",
      random,
    );
  }

  // 6. Add clusters of trees.
  // Pine and deciduous trees have identical gameplay behavior.
  const treeClusterCount = randomInt(4, 7, random);

  for (let i = 0; i < treeClusterCount; i++) {
    const centerX = randomInt(1, WIDTH - 2, random);
    const centerY = randomInt(4, HEIGHT - 5, random);
    const mainTreeType: TerrainType = random() < 0.6 ? "tree_p" : "tree_d"
    const otherTreeType: TerrainType = mainTreeType === "tree_p" ? "tree_d" : "tree_p";

    paintBlob(
      course,
      centerX,
      centerY,
      randomInt(1, 4, random),
      randomInt(1, 4, random),
      () => random() < 0.95 ? mainTreeType : otherTreeType,
      random,
    );
  }

  // 7. Replace a few fairway cells near the hole with slopes.
  // Slopes remain rare and never occupy the hole itself.
  const slopeCandidates: Point[] = [];

  for (let y = hole.y - 2; y <= hole.y + 2; y++) {
    for (let x = hole.x - 3; x <= hole.x + 3; x++) {
      if (
        x >= 0 &&
        x < WIDTH &&
        y >= 0 &&
        y < HEIGHT &&
        !(x === hole.x && y === hole.y) &&
        course[y][x] === "fairway"
      ) {
        slopeCandidates.push({ x, y });
      }
    }
  }

  const slopeCount = Math.min(
    randomInt(0, 3, random),
    slopeCandidates.length,
  );

  for (let i = 0; i < slopeCount; i++) {
    const index = randomInt(
      0,
      slopeCandidates.length - 1,
      random,
    );

    const [position] = slopeCandidates.splice(index, 1);

    if (position !== undefined) {
      const slopeIndex = randomInt(
        0,
        SLOPE_TYPES.length - 1,
        random,
      );

      const slope: SlopeType = SLOPE_TYPES[slopeIndex];

      course[position.y][position.x] = slope;
    }
  }

  // 8. Place the tee and hole last so they cannot be overwritten.
  course[tee.y][tee.x] = "tee";
  course[hole.y][hole.x] = "hole";

  return course;
}

export function renderCourseAsText(course: GolfCourse): string {
  const symbols: Record<TerrainType, string> = {
    tee: "sports_golf",
    tree_p: "park",
    tree_d: "forest",
    fairway: "r",
    rough: "remove",
    sand: "apps",
    water: "waves",
    hole: "golf_course",
    slope_u: "arrow_drop_up",
    slope_d: "arrow_drop_down",
    slope_l: "arrow_left",
    slope_r: "arrow_right",
  };

  const columnHeader = Array.from(
    { length: WIDTH },
    (_, x) => (x % 10).toString(),
  ).join(" ");

  const rows = course.map((row) => {
    const cells = row.map((terrain) => symbols[terrain]).join(" ");
    return `${cells}`;
  });

  return `   ${columnHeader}\n${rows.join("\n")}`;
}
