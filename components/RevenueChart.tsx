import type { RevenueDataPoint } from "@/lib/types";

export default function RevenueChart({ data }: { data: RevenueDataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-500">
        Revenue chart will populate once the pipeline has collected data.
      </div>
    );
  }

  const width = 400;
  const height = 80;
  const values = data.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data
    .map((point, index) => {
      const x = (index / (data.length - 1 || 1)) * width;
      const y = height - ((point.value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
      <h2 className="mb-2 text-sm font-medium text-slate-300">ME BESS GB Revenue</h2>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-20 w-full" preserveAspectRatio="none">
        <polyline points={points} fill="none" stroke="#00e5c8" strokeWidth={2} />
      </svg>
    </div>
  );
}
