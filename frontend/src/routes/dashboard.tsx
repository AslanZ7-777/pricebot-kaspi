import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Package, TrendingUp, ArrowLeftRight,
  TrendingDown, AlertTriangle, PauseCircle, Target, ChevronRight,
} from "lucide-react";
import { dashboardApi } from "@/api/dashboard";
import { dashboardKeys } from "@/lib/query-keys";
import { WinRateChart } from "@/components/dashboard/win-rate-chart";
import { PriceChangesBar } from "@/components/dashboard/price-changes-bar";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { cn } from "@/lib/utils";
import type { DashboardSummary } from "@/types";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function KpiCard({
  label, value, sub, icon: Icon, highlight,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; highlight?: boolean;
}) {
  return (
    <div className={cn(
      "bg-white/[.02] border rounded-xl p-4",
      highlight ? "border-white/10" : "border-white/[.06]",
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5 text-white/30 shrink-0" />
        <p className="text-xs text-white/40 truncate">{label}</p>
      </div>
      <p className="text-2xl font-semibold text-white leading-none">{value}</p>
      {sub && <p className="text-[11px] text-white/25 mt-1">{sub}</p>}
    </div>
  );
}

function StatusBanner({ summary }: { summary: DashboardSummary }) {
  const total = summary.total_products;
  const winning = summary.winning_products;
  const winRate = total > 0 ? Math.round((winning / total) * 100) : 0;
  const isGood = winRate >= 60;
  const hasError = summary.error_products > 0;

  return (
    <div className="border border-white/[.06] rounded-xl px-5 py-4 flex items-center justify-between bg-white/[.02]">
      <div className="flex items-center gap-3">
        <div className={cn(
          "h-2 w-2 rounded-full shrink-0",
          isGood ? "bg-green-400" : hasError ? "bg-red-400 animate-pulse" : "bg-yellow-400",
        )} />
        <div>
          <p className="text-sm font-medium text-white">
            {isGood
              ? `${winning} из ${total} позиций побеждают — всё под контролем`
              : hasError
              ? `${summary.error_products} товара с ошибками сканирования`
              : `${total - winning} позиций проигрывают конкурентам`}
          </p>
          <p className="text-xs text-white/30 mt-0.5">
            {summary.changes_today > 0
              ? `${summary.changes_today} авто-снижений сегодня · мониторинг активен`
              : "Сканирование ещё не выполнялось сегодня"}
          </p>
        </div>
      </div>
      <Link
        to="/products"
        className="flex items-center gap-1 text-xs text-white/30 hover:text-white transition-colors shrink-0"
      >
        Управление <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: dashboardKeys.summary,
    queryFn: dashboardApi.getSummary,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const cards = data
    ? [
        { label: "Товаров в мониторинге", value: data.total_products, sub: "активных позиций",        icon: Package },
        { label: "Побеждаем",             value: data.winning_products, sub: `из ${data.total_products}`, icon: TrendingUp, highlight: true },
        { label: "Авто-снижений",         value: data.changes_today,    sub: "сегодня",                icon: ArrowLeftRight },
        { label: "На минимуме",           value: data.floor_products,   sub: "достигли floor_price",   icon: TrendingDown },
        { label: "Ошибки",                value: data.error_products,   sub: "требуют внимания",       icon: AlertTriangle },
        { label: "На паузе",              value: data.paused_products,  sub: "авто-режим выкл.",       icon: PauseCircle },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-white">Дашборд</h1>
        <p className="text-sm text-white/30 mt-0.5">
          Мониторинг конкурентных цен на Kaspi.kz в реальном времени
        </p>
      </div>

      {/* Status banner */}
      {data && <StatusBanner summary={data} />}

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white/[.02] border border-white/[.04] rounded-xl h-20 animate-pulse" />
            ))
          : cards.map((c) => <KpiCard key={c.label} {...c} />)}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WinRateChart />
        <PriceChangesBar />
      </div>

      {/* Activity feed + quick links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ActivityFeed />
        </div>

        <div className="space-y-3">
          <div className="bg-white/[.02] border border-white/[.06] rounded-xl p-4">
            <h3 className="text-xs font-medium text-white/30 uppercase tracking-wider mb-3">Быстрые действия</h3>
            <div className="space-y-0.5">
              {[
                { label: "Добавить товар",  to: "/products",  icon: Package },
                { label: "Аналитика",       to: "/analytics", icon: Target },
                { label: "Настройки",       to: "/settings",  icon: PauseCircle },
              ].map(({ label, to, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-2 p-2 text-xs text-white/40 hover:text-white hover:bg-white/[.04] rounded-lg transition-colors"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  <ChevronRight className="h-3 w-3 ml-auto" />
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-white/[.02] border border-white/[.06] rounded-xl p-4">
            <h3 className="text-xs font-medium text-white/30 uppercase tracking-wider mb-3">Как работает</h3>
            <div className="space-y-2.5 text-xs text-white/40">
              {[
                "Добавьте URL товара с Kaspi.kz",
                "Установите шаг и минимальную цену",
                "Система автоматически снижает цену при конкуренции",
                "Получайте уведомления о каждом изменении",
              ].map((step, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-white/20 shrink-0">{i + 1}.</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
