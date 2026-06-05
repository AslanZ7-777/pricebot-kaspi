import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChevronLeft, ScanLine, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { productsApi } from "@/api/products";
import { productKeys } from "@/lib/query-keys";
import { formatPrice, formatRelativeTime } from "@/lib/utils";
import { StatusBadge } from "@/components/products/status-badge";
import { CompetitorPricesTable } from "@/components/product-detail/competitor-prices-table";
import { PriceHistoryChart } from "@/components/product-detail/price-history-chart";
import { PriceChangeLog } from "@/components/product-detail/price-change-log";
import { RepriceConfigForm } from "@/components/product-detail/reprice-config-form";
import { CompetitorAnalysis } from "@/components/product-detail/competitor-analysis";
import { AiRecommendations } from "@/components/product-detail/ai-recommendations";

export const Route = createFileRoute("/products/$productId")({
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { productId } = Route.useParams();

  const { data: product, isLoading } = useQuery({
    queryKey: productKeys.detail(productId),
    queryFn: () => productsApi.get(productId),
    staleTime: 30_000,
  });

  const { data: snapshots } = useQuery({
    queryKey: productKeys.snapshots(productId),
    queryFn: () => productsApi.getSnapshots(productId, 1, 50),
    staleTime: 60_000,
    enabled: !!product,
  });

  const scanMutation = useMutation({
    mutationFn: () => productsApi.scan(productId),
    onSuccess: () => toast.success("Сканирование запущено"),
    onError: () => toast.error("Не удалось запустить сканирование"),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-white/20" />
      </div>
    );
  }

  if (!product) {
    return <p className="text-white/30">Товар не найден</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/products" className="flex items-center gap-1 text-xs text-white/30 hover:text-white mb-4 transition-colors w-fit">
          <ChevronLeft className="h-3.5 w-3.5" /> Назад к товарам
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-semibold text-white truncate">
                {product.name ?? "Без названия"}
              </h1>
              <StatusBadge status={product.status} />
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <a
                href={product.omarket_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/25 hover:text-white/60 flex items-center gap-1 truncate max-w-xs transition-colors"
              >
                {product.omarket_url}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
            <p className="text-xs text-white/20 mt-1">
              Проверено: {formatRelativeTime(product.last_checked_at)}
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <p className="text-[10px] text-white/30">Наша цена</p>
              <p className="text-xl font-semibold font-mono text-white">{formatPrice(product.our_price)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/30">Мин. конкурент</p>
              <p className="text-xl font-semibold font-mono text-white/60">{formatPrice(product.min_competitor_price)}</p>
            </div>
            <button
              onClick={() => scanMutation.mutate()}
              disabled={scanMutation.isPending}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-white/[.08] hover:border-white/20 text-white/50 hover:text-white rounded-lg transition-colors disabled:opacity-40"
            >
              {scanMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanLine className="h-3.5 w-3.5" />}
              Сканировать
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: competitors + chart */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white/[.02] border border-white/[.06] rounded-xl p-5">
            <h2 className="text-sm font-medium text-white mb-4">Цены конкурентов</h2>
            <CompetitorPricesTable product={product} />
          </div>

          <div className="bg-white/[.02] border border-white/[.06] rounded-xl p-5">
            <PriceHistoryChart productId={productId} />
          </div>

          <div className="bg-white/[.02] border border-white/[.06] rounded-xl p-5">
            <h2 className="text-sm font-medium text-white mb-4">Журнал изменений цен</h2>
            <PriceChangeLog productId={productId} />
          </div>
        </div>

        {/* Right: config + analysis */}
        <div className="space-y-4">
          <div className="bg-white/[.02] border border-white/[.06] rounded-xl p-5">
            <h2 className="text-sm font-medium text-white mb-4">Настройки цены</h2>
            <RepriceConfigForm product={product} />
          </div>

          <AiRecommendations product={product} />

          <CompetitorAnalysis
            snapshots={snapshots ?? []}
            ourPrice={product.our_price ? Number(product.our_price) : null}
          />

          {/* Price position card */}
          {product.our_price && product.min_competitor_price && (
            <div className="bg-white/[.02] border border-white/[.06] rounded-xl p-5">
              <h2 className="text-sm font-medium text-white mb-3">Позиция на рынке</h2>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">Наша цена</span>
                  <span className="font-mono font-semibold text-white">{formatPrice(Number(product.our_price))}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">Мин. конкурент</span>
                  <span className={`font-mono font-semibold ${Number(product.our_price) <= Number(product.min_competitor_price) ? "text-green-400" : "text-orange-400"}`}>
                    {formatPrice(Number(product.min_competitor_price))}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">Разрыв</span>
                  <span className={`font-mono font-medium ${Number(product.our_price) <= Number(product.min_competitor_price) ? "text-green-400" : "text-red-400"}`}>
                    {Number(product.our_price) <= Number(product.min_competitor_price) ? "−" : "+"}
                    {formatPrice(Math.abs(Number(product.our_price) - Number(product.min_competitor_price)))}
                  </span>
                </div>
                {product.config && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">Запас до минимума</span>
                    <span className="font-mono text-white/40">
                      {formatPrice(Math.max(0, Number(product.our_price) - Number(product.config.floor_price)))}
                    </span>
                  </div>
                )}
                {product.config && (
                  <div className="pt-2">
                    <div className="relative h-1.5 bg-white/[.06] rounded-full overflow-hidden">
                      <div
                        className="absolute left-0 h-full bg-gradient-to-r from-red-500/40 via-yellow-400/40 to-green-400/40 rounded-full"
                        style={{ width: "100%" }}
                      />
                      {(() => {
                        const floor = Number(product.config!.floor_price);
                        const our = Number(product.our_price);
                        const comp = Number(product.min_competitor_price);
                        const range = Math.max(comp * 1.15 - floor, 1);
                        const ourPct = Math.min(((our - floor) / range) * 100, 100);
                        return (
                          <div
                            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow"
                            style={{ left: `calc(${ourPct}% - 5px)` }}
                            title={`Наша цена: ${formatPrice(our)}`}
                          />
                        );
                      })()}
                    </div>
                    <div className="flex justify-between text-[10px] text-white/20 mt-1">
                      <span>floor {formatPrice(Number(product.config.floor_price))}</span>
                      <span>рынок</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
