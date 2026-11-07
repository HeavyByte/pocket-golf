
type TerrainType =
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

type TerrainGrid = TerrainType[][];

const SOFT_TERRAINS = new Set<TerrainType>([
  "water",
  "sand",
  "fairway",
  "slope_u",
  "slope_d",
  "slope_l",
  "slope_r"
]);

const FAIRWAY_TERRAINS = [
  "fairway",
  "slope_u",
  "slope_d",
  "slope_l",
  "slope_r"
]


export function getTerrainEdgeClasses(
  course: TerrainGrid,
  x: number,
  y: number,
): string {
  const terrain = course[y]?.[x];

  if (!terrain || !SOFT_TERRAINS.has(terrain)) {
    return "";
  }

  const same = (dx: number, dy: number) => {
    if(FAIRWAY_TERRAINS.includes(terrain)){
      return FAIRWAY_TERRAINS.includes(course[y + dy]?.[x + dx]);
    }
  
    return course[y + dy]?.[x + dx] === terrain;
  }

  const corners = [
    !same(0, -1) && !same(-1, 0) //&& !same(-1, -1)
      && "corner-top-left",

    !same(0, -1) && !same(1, 0) //&& !same(1, -1)
      && "corner-top-right",

    !same(0, 1) && !same(-1, 0) //&& !same(-1, 1)
      && "corner-bottom-left",

    !same(0, 1) && !same(1, 0) //&& !same(1, 1)
      && "corner-bottom-right",
  ].filter(Boolean);

  return [...corners].join(" ");
}

