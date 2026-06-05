import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Clock, Users, ArrowLeftRight, Banknote, Target } from "lucide-react";
import { analyticsApi } from "@/api/dashboard";
import { analyticsKeys } from "@/lib/query-keys";

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  badge,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  badge?: { text: string; positive: boolean };
}) {
  return (
    <div className="bg-white/[.02] border border-white/[.06] rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <Icon className="h-4 w-4 text-white/30" />
        {badge && (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${badge.positive ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"}`}>
            {badge.text}
          </span>
        )}
      </div>
      <p className="text-2xl font-semibold text-white leading-none">{value}</p>
      <p className="text-xs text-white/40 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-white/20 mt-0.5">{sub}</p>}
    </div>
  );
}

export function AnalyticsOverviewCards() {
  const { data, isLoading } = useQuery({
    queryKey: analyticsKeys.overview,
    queryFn: analyticsApi.getOverview,
    staleTime: 60_000,
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white/[.02] border border-white/[.06] rounded-xl p-4 animate-pulse h-28" />
        ))}
      </div>
    );
  }

  const winRate = data.win_rate_pct;
  const impact = data.revenue_impact_tenge;
  const impactStr = impact >= 1_000_000
    ? `+₸${(impact / 1_000_000).toFixed(2)}М`
    : impact >= 1000
    ? `+₸${(impact / 1000).toFixed(0)}К`
    : `+₸${Math.round(impact)}`;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <MetricCard
        label="Win Rate"
        value={`${winRate}%`}
        sub="за последние 7 дней"
        icon={TrendingUp}
        badge={{ text: winRate >= 60 ? "Хорошо" : "Следите", positive: winRate >= 60 }}
      />
      <MetricCard
        label="Скорость реакции"
        value={data.avg_reprice_response_min > 0 ? `${data.avg_reprice_response_min} мин` : "—"}
        sub="среднее время авто-снижения"
        icon={Clock}
      />
      <MetricCard
        label="Конкуренты"
        value={String(data.competitors_tracked)}
        sub="уникальных продавцов (30д)"
        icon={Users}
      />
      <MetricCard
        label="Авто-снижений"
        value={String(data.total_price_changes_30d)}
        sub="за последние 30 дней"
        icon={ArrowLeftRight}
      />
      <MetricCard
        label="Выигрыш"
        value={data.revenue_impact_tenge > 0 ? impactStr : "—"}
        sub="экономия от авто-снижений"
        icon={Banknote}
        badge={data.revenue_impact_tenge > 0 ? { text: "Авто", positive: true } : undefined}
      />
      <MetricCard
        label="Лидируем"
        value={`${data.products_winning}/${data.products_total_with_data}`}
        sub="позиций с ценой ≤ конкурента"
        icon={Target}
      />
    </div>
  );
}
