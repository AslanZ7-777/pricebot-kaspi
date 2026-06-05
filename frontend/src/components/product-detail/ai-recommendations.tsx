import { Lightbulb, TrendingDown, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types";

interface Props {
  product: Product;
}

interface Recommendation {
  type: "action" | "info" | "warning" | "success";
  icon: React.ElementType;
  title: string;
  description: string;
  priority: number;
}

const TYPE_STYLES = {
  action:  { dot: "bg-blue-400" },
  info:    { dot: "bg-white/20" },
  warning: { dot: "bg-yellow-400" },
  success: { dot: "bg-green-400" },
};

function buildRecommendations(product: Product): Recommendation[] {
  const recs: Recommendation[] = [];
  const ourPrice = product.our_price ? Number(product.our_price) : null;
  const minComp = product.min_competitor_price ? Number(product.min_competitor_price) : null;
  const config = product.config;
  const floor = config?.floor_price ? Number(config.floor_price) : null;
  const step = config?.step ? Number(config.step) : 1000;

  if (!ourPrice) {
    recs.push({
      type: "warning",
      icon: AlertTriangle,
      title: "Нет данных о цене",
      description: "Запустите сканирование, чтобы получить текущую цену и данные конкурентов.",
      priority: 10,
    });
    return recs;
  }

  if (minComp && ourPrice > minComp) {
    const targetPrice = Math.max(minComp - step, floor ?? 0);
    const gapPct = (((ourPrice - minComp) / ourPrice) * 100).toFixed(1);
    recs.push({
      type: "action",
      icon: TrendingDown,
      title: `Снизьте цену до ${formatPrice(targetPrice)}`,
      description: `Конкурент предлагает ${formatPrice(minComp)} — вы проигрываете на ${gapPct}%. Авто-снижение активировано.`,
      priority: 1,
    });
  } else if (minComp && ourPrice <= minComp) {
    recs.push({
      type: "success",
      icon: CheckCircle,
      title: "Вы — самый выгодный продавец",
      description: `Ваша цена ${formatPrice(ourPrice)} ниже ближайшего конкурента ${formatPrice(minComp)}.`,
      priority: 5,
    });
  }

  if (floor && ourPrice && minComp) {
    const distToFloor = ourPrice - floor;
    if (distToFloor < step * 3 && ourPrice > minComp) {
      recs.push({
        type: "warning",
        icon: AlertTriangle,
        title: `До минимальной цены — ${formatPrice(distToFloor)}`,
        description: `Запас до нижней границы ограничен. Рассмотрите пересмотр floor_price или шага.`,
        priority: 2,
      });
    }
  }

  if (config?.auto_reprice === false) {
    recs.push({
      type: "warning",
      icon: AlertTriangle,
      title: "Авто-управление ценой выключено",
      description: "Автоматическое снижение остановлено. Включите в настройках для непрерывного мониторинга.",
      priority: 3,
    });
  }

  if (minComp === null && ourPrice) {
    recs.push({
      type: "info",
      icon: ArrowRight,
      title: "Нет данных о конкурентах",
      description: "Возможно, вы единственный продавец — или страница ещё не просканирована.",
      priority: 6,
    });
  }

  if (config && config.check_interval_minutes > 60 && minComp && ourPrice > minComp) {
    recs.push({
      type: "info",
      icon: ArrowRight,
      title: "Увеличьте частоту сканирования",
      description: `Интервал ${config.check_interval_minutes} мин долго для активной конкуренции. Рекомендуем 15–30 мин.`,
      priority: 7,
    });
  }

  return recs.sort((a, b) => a.priority - b.priority).slice(0, 4);
}

export function AiRecommendations({ product }: Props) {
  const recs = buildRecommendations(product);

  return (
    <div className="bg-white/[.02] border border-white/[.06] rounded-xl p-5 space-y-3">
      <h2 className="text-sm font-medium text-white flex items-center gap-2">
        <Lightbulb className="h-3.5 w-3.5 text-white/40" /> Рекомендации
      </h2>

      {recs.length === 0 ? (
        <p className="text-xs text-white/25">Загрузка анализа...</p>
      ) : (
        <div className="space-y-2">
          {recs.map((rec, i) => {
            const styles = TYPE_STYLES[rec.type];
            const Icon = rec.icon;
            return (
              <div key={i} className="flex gap-3 p-3 rounded-lg bg-white/[.02] border border-white/[.04]">
                <div className="shrink-0 flex items-start pt-0.5 gap-1.5">
                  <span className={cn("h-1.5 w-1.5 rounded-full mt-1 shrink-0", styles.dot)} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white/80">{rec.title}</p>
                  <p className="text-[11px] text-white/35 mt-0.5 leading-relaxed">{rec.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
