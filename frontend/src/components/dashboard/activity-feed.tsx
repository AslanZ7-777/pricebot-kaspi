import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { TrendingDown, ArrowRight, Loader2 } from "lucide-react";
import { analyticsApi } from "@/api/dashboard";
import { analyticsKeys } from "@/lib/query-keys";
import { formatPrice, formatRelativeTime } from "@/lib/utils";

function ChangeRow({ item }: { item: { product_id: string; product_name: string; old_price: number; new_price: number; attempted_at: string; reason: string } }) {
  const delta = item.new_price - item.old_price;
  const pct = Math.abs((delta / item.old_price) * 100).toFixed(1);
  const shortName = item.product_name
    .replace(" [DEMO]", "")
    .split(" ")
    .slice(0, 4)
    .join(" ");

  return (
    <Link
      to="/products/$productId"
      params={{ productId: item.product_id }}
      className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/[.03] rounded-lg transition-colors group"
    >
      <div className="p-1.5 rounded-md shrink-0 bg-white/[.04]">
        <TrendingDown className="h-3 w-3 text-white/40" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/70 truncate font-medium">{shortName}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-[11px] text-white/25 font-mono">{formatPrice(item.old_price)}</span>
          <ArrowRight className="h-2.5 w-2.5 text-white/15" />
          <span className="text-[11px] text-white/60 font-mono font-medium">{formatPrice(item.new_price)}</span>
          <span className="text-[10px] text-white/20 ml-1">−{pct}%</span>
        </div>
      </div>
      <span className="text-[10px] text-white/20 shrink-0 group-hover:text-white/40 transition-colors">
        {formatRelativeTime(item.attempted_at)}
      </span>
    </Link>
  );
}

export function ActivityFeed() {
  const { data, isLoading } = useQuery({
    queryKey: analyticsKeys.activityFeed,
    queryFn: analyticsApi.getActivityFeed,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return (
    <div className="bg-white/[.02] border border-white/[.06] rounded-xl p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-white">Последние изменения</h2>
        <Link to="/analytics" className="text-xs text-white/30 hover:text-white transition-colors">
          Вся история →
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center flex-1 min-h-[120px]">
          <Loader2 className="h-5 w-5 animate-spin text-white/20" />
        </div>
      ) : !data?.length ? (
        <div className="flex justify-center items-center flex-1 min-h-[120px] text-white/20 text-sm">
          Изменений пока нет
        </div>
      ) : (
        <div className="flex flex-col gap-0.5 overflow-y-auto max-h-72">
          {data.slice(0, 12).map((item) => (
            <ChangeRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
