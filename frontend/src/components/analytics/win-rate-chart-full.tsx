import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { analyticsApi } from "@/api/dashboard";
import { analyticsKeys } from "@/lib/query-keys";
import { Loader2 } from "lucide-react";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-[#111] border border-white/[.08] rounded-lg px-3 py-2.5 text-xs space-y-1 shadow-xl">
      <p className="text-white/40 font-medium">{label}</p>
      <p className="text-white font-semibold text-sm">{d?.win_rate}% Win Rate</p>
      <p className="text-white/30">{d?.winning} из {d?.total} позиций</p>
    </div>
  );
}

export function WinRateChartFull() {
  const { data, isLoading } = useQuery({
    queryKey: analyticsKeys.winRateTrend,
    queryFn: analyticsApi.getWinRateTrend,
    staleTime: 60_000,
  });

  const chartData = data?.map((d) => ({ ...d, date: d.date.slice(5) })) ?? [];
  const avg = chartData.length
    ? Math.round(chartData.reduce((s, d) => s + d.win_rate, 0) / chartData.length)
    : 0;

  return (
    <div className="bg-white/[.02] border border-white/[.06] rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-medium text-white">Динамика Win Rate — 30 дней</h2>
          <p className="text-xs text-white/30 mt-0.5">Среднее: {avg}% — процент позиций дешевле конкурентов</p>
        </div>
        {chartData.length > 0 && (
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <p className="text-[10px] text-white/30">Сейчас</p>
              <p className="font-semibold text-white">{chartData[chartData.length - 1]?.win_rate}%</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-white/30">Среднее</p>
              <p className="font-semibold text-white/60">{avg}%</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-white/30">Макс.</p>
              <p className="font-semibold text-white/60">{Math.max(...chartData.map((d) => d.win_rate))}%</p>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-56">
          <Loader2 className="h-6 w-6 animate-spin text-white/20" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex justify-center items-center h-56 text-white/20 text-sm">
          Нет данных — добавьте товары и дождитесь первого сканирования
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="wrGradFull" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="date"
              tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval={3}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            {avg > 0 && (
              <ReferenceLine
                y={avg}
                stroke="rgba(255,255,255,0.12)"
                strokeDasharray="4 4"
                label={{ value: `avg ${avg}%`, fill: "rgba(255,255,255,0.2)", fontSize: 10, position: "insideTopRight" }}
              />
            )}
            <Area
              type="monotone"
              dataKey="win_rate"
              stroke="rgba(255,255,255,0.6)"
              strokeWidth={1.5}
              fill="url(#wrGradFull)"
              dot={false}
              activeDot={{ r: 4, fill: "#ffffff", stroke: "rgba(255,255,255,0.2)", strokeWidth: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
