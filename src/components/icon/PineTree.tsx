export function PineTree() {
  return (
    <svg
      className="tree-shape pine"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="
          M 50 5
          Q 54 5 56 10
          L 78 44
          Q 82 51 74 51
          L 69 51
          L 85 76
          Q 89 84 80 84
          L 20 84
          Q 11 84 15 76
          L 31 51
          L 26 51
          Q 18 51 22 44
          L 44 10
          Q 46 5 50 5
          Z
        "
        fill="var(--pine-color)"
      />
    </svg>
  );
}
