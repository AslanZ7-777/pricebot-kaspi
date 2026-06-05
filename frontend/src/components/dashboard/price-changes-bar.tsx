import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { analyticsApi } from "@/api/dashboard";
import { analyticsKeys } from "@/lib/query-keys";
import { Loader2 } from "lucide-react";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111] border border-white/[.08] rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-white/40 mb-1">{label}</p>
      <p className="text-white font-semibold">{payload[0]?.value} изменений</p>
    </div>
  );
}

export function PriceChangesBar() {
  const { data, isLoading } = useQuery({
    queryKey: analyticsKeys.priceChangesTrend,
    queryFn: analyticsApi.getPriceChangesTrend,
    staleTime: 60_000,
  });

  const chartData = (data ?? []).slice(-14).map((d) => ({
    ...d,
    date: d.date.slice(5),
  }));

  const maxVal = Math.max(...chartData.map((d) => d.changes), 1);

  return (
    <div className="bg-white/[.02] border border-white/[.06] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-medium text-white">Автоизменения цен</h2>
          <p className="text-xs text-white/30 mt-0.5">Количество авто-снижений за день</p>
        </div>
        {data && (
          <div className="text-right">
            <span className="text-2xl font-semibold text-white">
              {data.reduce((s, d) => s + d.changes, 0)}
            </span>
            <p className="text-[10px] text-white/25 mt-0.5">за 30 дней</p>
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
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={12}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="changes" radius={[2, 2, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={index}
                  fill="rgba(255,255,255,0.15)"
                  fillOpacity={0.4 + (entry.changes / maxVal) * 0.6}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
