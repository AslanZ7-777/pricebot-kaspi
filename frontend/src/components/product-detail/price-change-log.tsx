import { useQuery } from "@tanstack/react-query";
import { productsApi } from "@/api/products";
import { productKeys } from "@/lib/query-keys";
import { formatPrice, formatDateTime } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const REASON_LABELS: Record<string, string> = {
  auto_reprice:  "Авто",
  manual:        "Вручную",
  floor_reached: "Мин. цена",
};

interface Props {
  productId: string;
}

export function PriceChangeLog({ productId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: productKeys.changes(productId),
    queryFn: () => productsApi.getPriceChanges(productId),
    staleTime: 30_000,
  });

  if (isLoading) {
    return <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-white/20" /></div>;
  }

  if (!data || data.length === 0) {
    return <p className="text-sm text-white/25 py-4">Изменений цен не было</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-white/25 border-b border-white/[.04]">
            <th className="text-left pb-2 pr-4 font-medium">Дата</th>
            <th className="text-left pb-2 pr-4 font-medium">Было</th>
            <th className="text-left pb-2 pr-4 font-medium">Стало</th>
            <th className="text-left pb-2 pr-4 font-medium">Изменение</th>
            <th className="text-left pb-2 pr-4 font-medium">Причина</th>
            <th className="text-left pb-2 font-medium">Статус</th>
          </tr>
        </thead>
        <tbody>
          {data.map((c) => {
            const delta = c.new_price - c.old_price;
            return (
              <tr key={c.id} className="border-b border-white/[.03]">
                <td className="py-2 pr-4 text-white/25">{formatDateTime(c.attempted_at)}</td>
                <td className="py-2 pr-4 font-mono text-white/35">{formatPrice(c.old_price)}</td>
                <td className="py-2 pr-4 font-mono text-white/70">{formatPrice(c.new_price)}</td>
                <td className={cn("py-2 pr-4 font-mono", delta < 0 ? "text-green-400" : "text-red-400")}>
                  {delta >= 0 ? "+" : ""}{formatPrice(delta)}
                </td>
                <td className="py-2 pr-4 text-white/35">{REASON_LABELS[c.reason] ?? c.reason}</td>
                <td className={cn("py-2", c.status === "success" ? "text-green-400" : c.status === "failed" ? "text-red-400" : c.status === "skipped" ? "text-yellow-400" : "text-white/30")}>
                  {c.status === "success" ? "Успех" : c.status === "failed" ? "Ошибка" : c.status === "skipped" ? "Пропущено" : "В очереди"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
