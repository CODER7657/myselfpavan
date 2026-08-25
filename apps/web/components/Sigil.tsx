/**
 * Renders an agent's 5×5 pixel sigil as a grid of hard squares. Deliberately
 * not an SVG icon set — the whole roster reads as one alphabet this way.
 */
export function Sigil({
  matrix,
  size = 3,
  color = "currentColor",
  gap = 1,
}: {
  matrix: number[][];
  size?: number;
  color?: string;
  gap?: number;
}) {
  const cols = matrix[0]?.length ?? 5;
  return (
    <span
      aria-hidden="true"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, ${size}px)`,
        gap: `${gap}px`,
        lineHeight: 0,
      }}
    >
      {matrix.flatMap((row, y) =>
        row.map((on, x) => (
          <span
            key={`${y}-${x}`}
            style={{
              width: size,
              height: size,
              background: on ? color : "transparent",
            }}
          />
        ))
      )}
    </span>
  );
}
