import { Package, TrendingDown, TrendingUp, AlertTriangle, PauseCircle, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardSummary } from "@/types";

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center gap-4">
      <div className={cn("p-2 rounded-md", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-zinc-100">{value}</p>
        <p className="text-xs text-zinc-500">{label}</p>
      </div>
    </div>
  );
}

interface Props {
  summary: DashboardSummary;
}

export function SummaryCards({ summary }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <StatCard label="Всего товаров" value={summary.total_products} icon={Package} color="bg-zinc-700 text-zinc-300" />
      <StatCard label="Побеждаем" value={summary.winning_products} icon={TrendingUp} color="bg-green-900/40 text-green-400" />
      <StatCard label="Изменений сегодня" value={summary.changes_today} icon={ArrowLeftRight} color="bg-blue-900/40 text-blue-400" />
      <StatCard label="На минимуме" value={summary.floor_products} icon={TrendingDown} color="bg-yellow-900/40 text-yellow-400" />
      <StatCard label="С ошибками" value={summary.error_products} icon={AlertTriangle} color="bg-red-900/40 text-red-400" />
      <StatCard label="На паузе" value={summary.paused_products} icon={PauseCircle} color="bg-zinc-700 text-zinc-400" />
    </div>
  );
}
