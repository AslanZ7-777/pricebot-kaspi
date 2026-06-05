import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BarChart3, RefreshCw, Trash2 } from "lucide-react";
import { AnalyticsOverviewCards } from "@/components/analytics/analytics-overview-cards";
import { WinRateChartFull } from "@/components/analytics/win-rate-chart-full";
import { CompetitorRanking } from "@/components/analytics/competitor-ranking";
import { PriceChangesBar } from "@/components/dashboard/price-changes-bar";
import { analyticsApi } from "@/api/dashboard";
import { analyticsKeys, dashboardKeys } from "@/lib/query-keys";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const queryClient = useQueryClient();

  const seedMutation = useMutation({
    mutationFn: analyticsApi.seedDemo,
    onSuccess: (data: any) => {
      if (data?.status === "already_seeded") {
        toast.info("Демо данные уже загружены");
      } else {
        toast.success(`Демо загружен: ${data?.seeded_products} товаров`);
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: analyticsKeys.overview });
        queryClient.invalidateQueries({ queryKey: analyticsKeys.winRateTrend });
        queryClient.invalidateQueries({ queryKey: analyticsKeys.competitors });
        queryClient.invalidateQueries({ queryKey: analyticsKeys.activityFeed });
        queryClient.invalidateQueries({ queryKey: dashboardKeys.summary });
      }
    },
    onError: () => toast.error("Не удалось загрузить демо данные"),
  });

  const clearMutation = useMutation({
    mutationFn: analyticsApi.clearDemo,
    onSuccess: (data: any) => {
      toast.success(`Удалено ${data?.deleted_products} демо товаров`);
      queryClient.invalidateQueries();
    },
    onError: () => toast.error("Не удалось очистить демо данные"),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-white/40" />
            <h1 className="text-lg font-semibold text-white">Аналитика</h1>
          </div>
          <p className="text-sm text-white/30 mt-0.5">
            Конкурентоспособность, динамика цен и поведение конкурентов
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-white/50 border border-white/[.06] hover:border-white/20 hover:text-white rounded-lg transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`h-3 w-3 ${seedMutation.isPending ? "animate-spin" : ""}`} />
            {seedMutation.isPending ? "Загрузка..." : "Загрузить демо"}
          </button>
          <button
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-white/30 border border-white/[.06] hover:border-white/20 hover:text-white rounded-lg transition-colors disabled:opacity-40"
          >
            <Trash2 className="h-3 w-3" />
            Очистить
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <AnalyticsOverviewCards />

      {/* Win Rate Trend */}
      <WinRateChartFull />

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <PriceChangesBar />

        <div className="bg-white/[.02] border border-white/[.06] rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-medium text-white">Как это работает</h2>
          <div className="space-y-4">
            {[
              { n: "1", title: "Сканирование страницы",      desc: "Playwright открывает страницу товара на Kaspi.kz, извлекает цены всех продавцов" },
              { n: "2", title: "Анализ конкурентов",         desc: "Система находит минимальную цену конкурента и сравнивает с вашей" },
              { n: "3", title: "Автоматическое снижение",    desc: "Если конкурент дешевле — цена снижается на шаг, не ниже floor_price" },
              { n: "4", title: "Уведомления в реальном времени", desc: "WebSocket уведомления о каждом изменении цены" },
            ].map(({ n, title, desc }) => (
              <div key={n} className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-white/[.06] flex items-center justify-center shrink-0 text-[10px] font-medium text-white/40 mt-0.5">{n}</span>
                <div>
                  <p className="text-sm font-medium text-white/80">{title}</p>
                  <p className="text-xs text-white/30 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Competitor Ranking */}
      <CompetitorRanking />

      {/* Strategy cards */}
      <div className="bg-white/[.02] border border-white/[.06] rounded-xl p-5">
        <h2 className="text-sm font-medium text-white mb-4">Стратегии ценообразования</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: "Агрессивная",
              badge: "Максимум продаж",
              positive: false,
              desc: "Всегда быть на 1₸ дешевле минимального конкурента. Step = 1. Максимальные продажи, минимальная маржа.",
              pros: ["↑ Объём продаж", "↑ Видимость в поиске"],
              cons: ["↓ Маржа", "↑ Частые изменения"],
            },
            {
              title: "Балансная",
              badge: "Рекомендуем",
              positive: true,
              desc: "Step = 100–500₸. Держаться в топ-3 по цене. Баланс между продажами и прибылью.",
              pros: ["↑ Стабильность", "↑ Маржа"],
              cons: ["Иногда не в топ-1"],
            },
            {
              title: "Консервативная",
              badge: "Максимум маржи",
              positive: true,
              desc: "Step = 1000₸+. Снижаться только при значительном разрыве. Большая маржа, меньше продаж.",
              pros: ["↑ Прибыль с единицы", "↓ Частота изменений"],
              cons: ["↓ Объём продаж"],
            },
          ].map((s) => (
            <div key={s.title} className="bg-white/[.03] border border-white/[.04] rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-white">{s.title}</h3>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${s.positive ? "text-green-400 bg-green-400/10" : "text-orange-400 bg-orange-400/10"}`}>{s.badge}</span>
              </div>
              <p className="text-xs text-white/35 leading-relaxed">{s.desc}</p>
              <div className="space-y-1 pt-1">
                {s.pros.map((p) => <p key={p} className="text-[11px] text-white/50">{p}</p>)}
                {s.cons.map((c) => <p key={c} className="text-[11px] text-white/20">{c}</p>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
