import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate } from "@/lib/utils.js";

const AXIS = { stroke: "#64748B", fontSize: 11 };
const GRID = "rgba(148,163,184,0.1)";

function ChartTooltip({ active, payload, label, suffix = "%" }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="panel px-3 py-2 text-xs">
      <p className="mb-1 font-medium text-ink">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-ink-muted">
          <span style={{ color: p.color || p.fill }}>●</span> {p.name}: {p.value}
          {suffix}
        </p>
      ))}
    </div>
  );
}

export function TrendChart({ data }: { data: { date: string; rate: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7C5CFC" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#7C5CFC" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={(d) => formatDate(d).replace(/,.*/, "")} {...AXIS} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} {...AXIS} tickLine={false} axisLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Area type="monotone" dataKey="rate" name="Attendance" stroke="#7C5CFC" strokeWidth={2} fill="url(#trendFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const BAR_COLORS = ["#7C5CFC", "#3B82F6", "#22D3EE", "#8B5CF6", "#06B6D4", "#6366F1"];

export function RatesBarChart({
  data,
  threshold,
}: {
  data: { name: string; rate: number }[];
  threshold?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="name" {...AXIS} tickLine={false} axisLine={false} interval={0} angle={0} />
        <YAxis domain={[0, 100]} {...AXIS} tickLine={false} axisLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="rate" name="Rate" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={threshold !== undefined && d.rate < threshold ? "#F43F5E" : BAR_COLORS[i % BAR_COLORS.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MiniBarChart({ data }: { data: { label: string; rate: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="label" {...AXIS} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} {...AXIS} tickLine={false} axisLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="rate" name="Attendance" fill="#22D3EE" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
