import { useQuery } from "@tanstack/react-query";
import { Loader2, Zap, Minus, Shield } from "lucide-react";
import { analyticsApi } from "@/api/dashboard";
import { analyticsKeys } from "@/lib/query-keys";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { CompetitorEntry } from "@/types";

const AGGRESSION_CONFIG = {
  high:   { label: "Агрессивный", icon: Zap,    dotColor: "bg-red-400" },
  medium: { label: "Умеренный",   icon: Minus,  dotColor: "bg-yellow-400" },
  low:    { label: "Пассивный",   icon: Shield, dotColor: "bg-green-400" },
};

function AggressionBadge({ level }: { level: CompetitorEntry["aggression"] }) {
  const cfg = AGGRESSION_CONFIG[level];
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] text-white/50">
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dotColor)} />
      {cfg.label}
    </span>
  );
}

function UndercutBar({ ratio }: { ratio: number }) {
  const pct = Math.min(ratio * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-white/[.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all bg-white/30"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-white/30 w-7 text-right">{Math.round(pct)}%</span>
    </div>
  );
}

export function CompetitorRanking() {
  const { data, isLoading } = useQuery({
    queryKey: analyticsKeys.competitors,
    queryFn: analyticsApi.getCompetitors,
    staleTime: 120_000,
  });

  return (
    <div className="bg-white/[.02] border border-white/[.06] rounded-xl p-5">
      <div className="mb-4">
        <h2 className="text-sm font-medium text-white">Рейтинг конкурентов</h2>
        <p className="text-xs text-white/30 mt-0.5">Кто чаще всего нас обгонял за 30 дней</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <Loader2 className="h-5 w-5 animate-spin text-white/20" />
        </div>
      ) : !data?.length ? (
        <div className="flex justify-center items-center h-32 text-white/20 text-sm">
          Нет данных о конкурентах
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/25 border-b border-white/[.04]">
                <th className="text-left pb-2.5 font-medium pr-3">#</th>
                <th className="text-left pb-2.5 font-medium pr-4">Продавец</th>
                <th className="text-left pb-2.5 font-medium pr-4 hidden sm:table-cell">Товаров</th>
                <th className="text-left pb-2.5 font-medium pr-4">Средн. цена</th>
                <th className="text-left pb-2.5 font-medium pr-4">Агрессивность</th>
                <th className="text-left pb-2.5 font-medium">Обгонял нас</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c, i) => (
                <tr key={c.seller} className="border-b border-white/[.03] hover:bg-white/[.02] transition-colors">
                  <td className="py-2.5 pr-3 text-white/20">{i + 1}</td>
                  <td className="py-2.5 pr-4">
                    <span className="font-medium text-white/70">{c.seller}</span>
                  </td>
                  <td className="py-2.5 pr-4 hidden sm:table-cell text-white/35">{c.products_count}</td>
                  <td className="py-2.5 pr-4 font-mono text-white/55">{formatPrice(c.avg_price)}</td>
                  <td className="py-2.5 pr-4">
                    <AggressionBadge level={c.aggression} />
                  </td>
                  <td className="py-2.5 min-w-[100px]">
                    <UndercutBar ratio={c.times_undercut / Math.max(c.appearances, 1)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
