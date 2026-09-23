"use client";

import type { HistoryResponse } from "@traffic-twin/contracts";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useTheme } from "@/shared/theme";

const COLORS = ["#0284c7", "#7c3aed"];

export function HistoryChart({
  history,
  cursorTimestamp,
  seriesLabels,
}: {
  history: HistoryResponse;
  cursorTimestamp?: string;
  seriesLabels?: Record<string, string>;
}) {
  const { theme } = useTheme();
  const rows = new Map<string, Record<string, number | string>>();
  for (const series of history.series) {
    for (const point of series.points) {
      const row = rows.get(point.timestamp) ?? { timestamp: point.timestamp };
      row[series.assetId] = point.value;
      rows.set(point.timestamp, row);
    }
  }
  const data = [...rows.values()].sort((left, right) =>
    String(left.timestamp).localeCompare(String(right.timestamp)),
  );

  if (data.length === 0) {
    return (
      <div className="grid h-80 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center dark:border-slate-700 dark:bg-slate-950">
        <div>
          <p className="font-semibold text-slate-700 dark:text-slate-200">
            Bu aralıkta veri yok
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Eksik günler gerçek ölçüm gibi doldurulmadı.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-96 w-full"
      role="img"
      aria-label={`Trafik geçmiş grafiği, ${history.series.length} seri, ${data.length} zaman noktası`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          accessibilityLayer
          data={data}
          margin={{ top: 12, right: 18, left: 4, bottom: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme === "dark" ? "#334155" : "#e2e8f0"}
          />
          <XAxis
            dataKey="timestamp"
            minTickGap={36}
            tickFormatter={(value: string) =>
              new Intl.DateTimeFormat("tr-TR", {
                month: "short",
                day: "2-digit",
                hour: history.resolution === "day" ? undefined : "2-digit",
                minute: history.resolution === "minute" ? "2-digit" : undefined,
                timeZone: history.timeZone,
              }).format(new Date(value))
            }
            tick={{
              fontSize: 11,
              fill: theme === "dark" ? "#cbd5e1" : "#475569",
            }}
          />
          <YAxis
            tick={{
              fontSize: 11,
              fill: theme === "dark" ? "#cbd5e1" : "#475569",
            }}
            width={48}
            tickFormatter={(value: number) =>
              new Intl.NumberFormat("tr-TR", {
                maximumFractionDigits: 0,
              }).format(value)
            }
          />
          <Tooltip
            contentStyle={{
              background: theme === "dark" ? "#0f172a" : "#ffffff",
              borderColor: theme === "dark" ? "#475569" : "#e2e8f0",
              color: theme === "dark" ? "#f8fafc" : "#0f172a",
            }}
            labelFormatter={(value) =>
              new Intl.DateTimeFormat("tr-TR", {
                dateStyle: "medium",
                timeStyle: history.resolution === "day" ? undefined : "short",
                timeZone: history.timeZone,
              }).format(new Date(String(value)))
            }
            formatter={(value) => [
              new Intl.NumberFormat("tr-TR", {
                maximumFractionDigits: 1,
              }).format(Number(value)),
              history.query.metric === "average-speed-kmh" ? "km/sa" : "araç",
            ]}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11 }}
          />
          {cursorTimestamp ? (
            <ReferenceLine
              x={cursorTimestamp}
              stroke="#0f172a"
              strokeDasharray="4 4"
              label={{
                value: "Replay",
                position: "insideTopRight",
                fontSize: 10,
              }}
            />
          ) : null}
          {history.series.map((series, index) => (
            <Line
              key={series.assetId}
              type="monotone"
              dataKey={series.assetId}
              name={seriesLabels?.[series.assetId] ?? series.assetName}
              stroke={COLORS[index]}
              dot={false}
              connectNulls={false}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
