interface Props {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
}

/** Pure-SVG sparkline used inside KPI cards. Server-renderable. */
export function Sparkline({
  data,
  width = 120,
  height = 36,
  color = "#006b61",
  fill = true,
}: Props) {
  if (data.length === 0) {
    return <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} />;
  }
  const max = Math.max(1, ...data);
  const min = Math.min(0, ...data);
  const range = max - min || 1;
  const step = data.length > 1 ? width / (data.length - 1) : width;

  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - 2 - ((v - min) / range) * (height - 4);
    return { x, y };
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const fillPath = `${path} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} preserveAspectRatio="none">
      {fill && (
        <path d={fillPath} fill={color} fillOpacity={0.12} />
      )}
      <path d={path} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
