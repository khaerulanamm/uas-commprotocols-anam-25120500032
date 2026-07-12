type Props = { score: number; min?: number; max?: number };

export function ScoreGauge({ score, min = 300, max = 850 }: Props) {
  const clamped = Math.max(min, Math.min(max, score));
  const pct = (clamped - min) / (max - min);
  const radius = 90;
  const circumference = Math.PI * radius; // semicircle
  const dash = circumference * pct;
  const color =
    pct >= 0.75
      ? "var(--color-success)"
      : pct >= 0.55
        ? "var(--color-accent)"
        : pct >= 0.4
          ? "var(--color-warning)"
          : "var(--color-destructive)";

  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 220 130" className="w-full max-w-[280px]">
        <defs>
          <linearGradient id="gauge-grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="var(--color-destructive)" />
            <stop offset="45%" stopColor="var(--color-warning)" />
            <stop offset="100%" stopColor="var(--color-success)" />
          </linearGradient>
        </defs>
        <path
          d="M20,110 A90,90 0 0 1 200,110"
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M20,110 A90,90 0 0 1 200,110"
          fill="none"
          stroke="url(#gauge-grad)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: "stroke-dasharray 800ms ease" }}
        />
        <text
          x="110"
          y="95"
          textAnchor="middle"
          className="font-display"
          style={{ fontSize: 42, fontWeight: 700, fill: color }}
        >
          {clamped}
        </text>
        <text
          x="110"
          y="118"
          textAnchor="middle"
          style={{ fontSize: 11, fill: "var(--color-muted-foreground)", letterSpacing: 2 }}
        >
          CREDIT SCORE
        </text>
      </svg>
      <div className="mt-1 flex w-full max-w-[280px] justify-between px-1 text-[10px] text-muted-foreground">
        <span>{min}</span>
        <span>{Math.round((min + max) / 2)}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
