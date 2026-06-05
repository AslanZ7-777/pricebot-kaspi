import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { productsApi } from "@/api/products";
import { productKeys } from "@/lib/query-keys";
import { formatPrice } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const RANGES = [7, 30, 90] as const;

interface Props {
  productId: string;
}

export function PriceHistoryChart({ productId }: Props) {
  const [days, setDays] = useState<typeof RANGES[number]>(7);

  const { data, isLoading } = useQuery({
    queryKey: productKeys.history(productId, days),
    queryFn: () => productsApi.getPriceHistory(productId, days),
    staleTime: 5 * 60_000,
  });

  const chartData = (data ?? []).map((p) => ({
    time: format(new Date(p.captured_at), days <= 7 ? "HH:mm dd.MM" : "dd.MM", { locale: ru }),
    ourPrice: p.our_price,
    minCompetitor: p.min_competitor_price,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-white">История цен</p>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setDays(r)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors border ${
                days === r
                  ? "border-white/20 bg-white/[.06] text-white"
                  : "border-white/[.04] text-white/30 hover:text-white hover:border-white/20"
              }`}
            >
              {r}д
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-4 w-4 animate-spin text-white/20" /></div>
      ) : chartData.length < 2 ? (
        <p className="text-sm text-white/20 py-10 text-center">Недостаточно данных для графика</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={(v) => (v / 1000).toFixed(0) + "k"}
              tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }}
              width={40}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }}
              labelStyle={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}
              itemStyle={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}
              formatter={(value: number, name: string) => [
                formatPrice(value),
                name === "ourPrice" ? "Наша цена" : "Мин. конкурент",
              ]}
            />
            <Legend
              formatter={(v) => (v === "ourPrice" ? "Наша цена" : "Мин. конкурент")}
              wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}
            />
            <Line
              type="monotone"
              dataKey="ourPrice"
              stroke="rgba(255,255,255,0.7)"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: "#fff" }}
            />
            <Line
              type="monotone"
              dataKey="minCompetitor"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
              activeDot={{ r: 3, fill: "rgba(255,255,255,0.5)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
