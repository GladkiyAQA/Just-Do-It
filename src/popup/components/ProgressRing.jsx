// SVG ring progress with percentage in the centre. Inherits color from
// `currentColor` so callers can tint it via Tailwind/CSS.

export default function ProgressRing({ percent = 0, size = 38, stroke = 3.5 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const safe = Math.max(0, Math.min(100, percent));
  const offset = circumference * (1 - safe / 100);
  return (
    <svg
      width={size}
      height={size}
      className="flex-shrink-0"
      viewBox={`0 0 ${size} ${size}`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.45s ease' }}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize={size * 0.26}
        fontWeight="700"
        fill="currentColor"
      >
        {Math.round(safe)}%
      </text>
    </svg>
  );
}
