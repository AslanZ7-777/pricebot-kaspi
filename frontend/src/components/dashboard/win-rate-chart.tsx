import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { analyticsApi } from "@/api/dashboard";
import { analyticsKeys } from "@/lib/query-keys";
import { Loader2 } from "lucide-react";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111] border border-white/[.08] rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-white/40 mb-1">{label}</p>
      <p className="text-white font-semibold">Win Rate: {payload[0]?.value}%</p>
      <p className="text-white/30">{payload[0]?.payload?.winning}/{payload[0]?.payload?.total} позиций</p>
    </div>
  );
}

export function WinRateChart() {
  const { data, isLoading } = useQuery({
    queryKey: analyticsKeys.winRateTrend,
    queryFn: analyticsApi.getWinRateTrend,
    staleTime: 60_000,
  });

  const chartData = data?.map((d) => ({
    ...d,
    date: d.date.slice(5), // MM-DD
  })) ?? [];

  return (
    <div className="bg-white/[.02] border border-white/[.06] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-medium text-white">Win Rate — 30 дней</h2>
          <p className="text-xs text-white/30 mt-0.5">Доля позиций, где мы дешевле конкурентов</p>
        </div>
        {data && data.length > 0 && (
          <div className="text-right">
            <span className="text-2xl font-semibold text-white">
              {data[data.length - 1]?.win_rate ?? 0}%
            </span>
            <p className="text-[10px] text-white/25 mt-0.5">сегодня</p>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-5 w-5 animate-spin text-white/20" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex justify-center items-center h-40 text-white/20 text-sm">
          Нет данных
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="winRateGrad" x1="0" y1="0" x2="0" y2="1">
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
              interval={4}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="win_rate"
              stroke="rgba(255,255,255,0.6)"
              strokeWidth={1.5}
              fill="url(#winRateGrad)"
              dot={false}
              activeDot={{ r: 3, fill: "#ffffff", stroke: "rgba(255,255,255,0.3)", strokeWidth: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
