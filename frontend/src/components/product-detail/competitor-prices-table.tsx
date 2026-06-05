import { useQuery } from "@tanstack/react-query";
import { productsApi } from "@/api/products";
import { productKeys } from "@/lib/query-keys";
import { formatPrice } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

interface Props {
  product: Product;
}

export function CompetitorPricesTable({ product }: Props) {
  const { data: snapshots, isLoading } = useQuery({
    queryKey: productKeys.snapshots(product.id),
    queryFn: () => productsApi.getSnapshots(product.id, 1, 1),
    staleTime: 60_000,
  });

  const latest = snapshots?.[0];
  const competitors = latest?.raw_competitors ?? [];

  if (isLoading) {
    return <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-white/20" /></div>;
  }

  if (!latest || competitors.length === 0) {
    return <p className="text-sm text-white/25 py-4">Нет данных о конкурентах</p>;
  }

  const sorted = [...competitors].sort((a, b) => a.price - b.price);
  const minPrice = sorted[0]?.price;

  return (
    <div>
      <p className="text-[10px] text-white/20 mb-3">{new Date(latest.captured_at).toLocaleString("ru-RU")}</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] text-white/25 border-b border-white/[.04]">
            <th className="text-left pb-2 pr-4 font-medium">Поставщик</th>
            <th className="text-left pb-2 pr-4 font-medium">Цена</th>
            <th className="text-left pb-2 font-medium">Наличие</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c, i) => (
            <tr
              key={i}
              className={cn(
                "border-b border-white/[.03]",
                c.price === minPrice && "bg-green-400/[.03]"
              )}
            >
              <td className="py-2 pr-4 text-white/60 text-xs">{c.seller || "—"}</td>
              <td className={cn("py-2 pr-4 font-mono text-xs font-medium", c.price === minPrice ? "text-green-400" : "text-white/70")}>
                {formatPrice(c.price)}
                {c.price === minPrice && <span className="ml-1.5 text-[10px] text-green-400/60">min</span>}
              </td>
              <td className="py-2">
                <span className={cn("text-[10px]", c.in_stock ? "text-green-400/70" : "text-white/20")}>
                  {c.in_stock ? "В наличии" : "Нет"}
                </span>
              </td>
            </tr>
          ))}
          {product.our_price != null && (
            <tr className="bg-white/[.03] border-b border-white/[.03]">
              <td className="py-2 pr-4 text-white/60 text-xs font-medium">Мы</td>
              <td className="py-2 pr-4 font-mono text-xs font-semibold text-white">{formatPrice(product.our_price)}</td>
              <td className="py-2 text-[10px] text-white/40">В наличии</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
