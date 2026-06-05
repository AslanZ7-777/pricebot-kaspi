import { Zap, Minus, Shield, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils";
import type { PriceSnapshot } from "@/types";

interface Props {
  snapshots: PriceSnapshot[];
  ourPrice: number | null;
}

interface CompetitorStats {
  seller: string;
  appearances: number;
  avgPrice: number;
  minPrice: number;
  timesUndercut: number;
  aggression: "high" | "medium" | "low";
}

function computeStats(snapshots: PriceSnapshot[], ourPrice: number | null): CompetitorStats[] {
  const map: Record<string, { prices: number[]; undercutCount: number }> = {};
  for (const snap of snapshots) {
    if (!snap.raw_competitors) continue;
    for (const c of snap.raw_competitors) {
      if (!c.seller) continue;
      if (!map[c.seller]) map[c.seller] = { prices: [], undercutCount: 0 };
      map[c.seller].prices.push(Number(c.price));
      if (ourPrice && Number(c.price) < ourPrice) {
        map[c.seller].undercutCount++;
      }
    }
  }
  return Object.entries(map)
    .map(([seller, stats]) => {
      const appearances = stats.prices.length;
      const avgPrice = stats.prices.reduce((a, b) => a + b, 0) / appearances;
      const minPrice = Math.min(...stats.prices);
      const ratio = stats.undercutCount / Math.max(appearances, 1);
      return {
        seller, appearances, avgPrice, minPrice,
        timesUndercut: stats.undercutCount,
        aggression: ratio > 0.5 ? "high" : ratio > 0.2 ? "medium" : "low",
      } as CompetitorStats;
    })
    .sort((a, b) => b.timesUndercut - a.timesUndercut)
    .slice(0, 8);
}

const AGGR_CFG = {
  high:   { label: "Агрессивный", icon: Zap,    dot: "bg-red-400" },
  medium: { label: "Умеренный",   icon: Minus,  dot: "bg-yellow-400" },
  low:    { label: "Пассивный",   icon: Shield, dot: "bg-green-400" },
};

export function CompetitorAnalysis({ snapshots, ourPrice }: Props) {
  const stats = computeStats(snapshots, ourPrice);

  if (!stats.length) {
    return (
      <div className="bg-white/[.02] border border-white/[.06] rounded-xl p-5">
        <h2 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-white/40" /> Анализ конкурентов
        </h2>
        <p className="text-xs text-white/25">Нет данных — дождитесь первого сканирования</p>
      </div>
    );
  }

  const dangerCount = stats.filter((s) => s.aggression !== "low").length;

  return (
    <div className="bg-white/[.02] border border-white/[.06] rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-white flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-white/40" /> Анализ конкурентов
        </h2>
        <div className="flex gap-2">
          <span className="text-[10px] text-white/30 px-2 py-0.5 bg-white/[.04] rounded-md">{stats.length} конкурентов</span>
          {dangerCount > 0 && (
            <span className="text-[10px] text-orange-400 px-2 py-0.5 bg-orange-400/10 rounded-md">{dangerCount} активных</span>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        {stats.map((c) => {
          const cfg = AGGR_CFG[c.aggression];
          return (
            <div key={c.seller} className="flex items-center gap-3 bg-white/[.02] rounded-lg px-3 py-2">
              <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/70 font-medium truncate">{c.seller}</span>
                  <span className="text-[10px] text-white/30">{cfg.label}</span>
                </div>
                <div className="flex gap-3 mt-0.5">
                  <span className="text-[10px] text-white/25">
                    мин: <span className="text-white/50 font-mono">{formatPrice(c.minPrice)}</span>
                  </span>
                  <span className="text-[10px] text-white/25">
                    обгонял: <span className={c.timesUndercut > 0 ? "text-orange-400" : "text-white/25"}>{c.timesUndercut}×</span>
                  </span>
                </div>
              </div>
              <div className="w-10">
                <div className="h-1 bg-white/[.06] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-white/25"
                    style={{ width: `${Math.min((c.timesUndercut / Math.max(c.appearances, 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
