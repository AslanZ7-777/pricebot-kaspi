import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Play, Pause, Trash2, ScanLine, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { productsApi } from "@/api/products";
import { productKeys } from "@/lib/query-keys";
import { formatPrice, formatRelativeTime } from "@/lib/utils";
import { StatusBadge } from "./status-badge";
import type { Product } from "@/types";

interface Props {
  search: string;
  statusFilter: string | null;
}

export function ProductsTable({ search, statusFilter }: Props) {
  const qc = useQueryClient();
  const [scanningId, setScanningId] = useState<string | null>(null);

  const filters = { page: 1, page_size: 50, search: search || undefined };
  const { data, isLoading } = useQuery({
    queryKey: productKeys.list(filters),
    queryFn: () => productsApi.list(filters),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const toggleReprice = useMutation({
    mutationFn: ({ id, enable }: { id: string; enable: boolean }) =>
      enable ? productsApi.resume(id) : productsApi.pause(id),
    onMutate: ({ id, enable }) => {
      const prev = qc.getQueryData<{ items: Product[] }>(productKeys.list(filters));
      if (prev) {
        qc.setQueryData(productKeys.list(filters), {
          ...prev,
          items: prev.items.map((p) =>
            p.id === id ? { ...p, config: p.config ? { ...p.config, auto_reprice: enable } : p.config } : p
          ),
        });
      }
      return { prev };
    },
    onError: (_err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(productKeys.list(filters), ctx.prev);
      toast.error("Не удалось изменить статус");
    },
  });

  const scanProduct = async (id: string) => {
    setScanningId(id);
    try {
      await productsApi.scan(id);
      toast.success("Сканирование запущено");
    } catch {
      toast.error("Не удалось запустить сканирование");
    } finally {
      setScanningId(null);
    }
  };

  const deleteProduct = useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.all });
      toast.success("Товар удалён");
    },
    onError: () => toast.error("Не удалось удалить товар"),
  });

  const products = data?.items ?? [];
  const filtered = statusFilter
    ? products.filter((p) => p.status === statusFilter)
    : products;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-500">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Загрузка...
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-500 text-sm">
        {search || statusFilter ? "Нет товаров по фильтру" : "Нет товаров. Добавьте первый товар."}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[.06] text-xs text-white/30 text-left">
            <th className="pb-3 pr-4 font-medium">Товар</th>
            <th className="pb-3 pr-4 font-medium">Наша цена</th>
            <th className="pb-3 pr-4 font-medium">Мин. конкурент</th>
            <th className="pb-3 pr-4 font-medium">Статус</th>
            <th className="pb-3 pr-4 font-medium">Проверен</th>
            <th className="pb-3 pr-4 font-medium">Авто</th>
            <th className="pb-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              isScanning={scanningId === product.id}
              onScan={() => scanProduct(product.id)}
              onToggleReprice={(enable) => toggleReprice.mutate({ id: product.id, enable })}
              onDelete={() => {
                if (confirm(`Удалить товар "${product.name ?? product.omarket_url}"?`)) {
                  deleteProduct.mutate(product.id);
                }
              }}
            />
          ))}
        </tbody>
      </table>
      {data && data.total > products.length && (
        <p className="text-xs text-zinc-500 mt-3 text-center">
          Показано {products.length} из {data.total}
        </p>
      )}
    </div>
  );
}

interface RowProps {
  product: Product;
  isScanning: boolean;
  onScan: () => void;
  onToggleReprice: (enable: boolean) => void;
  onDelete: () => void;
}

function ProductRow({ product, isScanning, onScan, onToggleReprice, onDelete }: RowProps) {
  const autoReprice = product.config?.auto_reprice ?? false;
  const delta =
    product.our_price != null && product.min_competitor_price != null
      ? product.our_price - product.min_competitor_price
      : null;

  return (
    <tr className="border-b border-white/[.04] hover:bg-white/[.02] transition-colors">
      <td className="py-3 pr-4">
        <div className="flex items-start gap-1.5">
          <Link
            to="/products/$productId"
            params={{ productId: product.id }}
            className="text-white hover:text-white/70 font-medium truncate max-w-[200px] transition-colors"
          >
            {product.name ?? "Без названия"}
          </Link>
          <a
            href={product.omarket_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/20 hover:text-white/50 mt-0.5 transition-colors"
            title="Открыть на Kaspi.kz"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </td>
      <td className="py-3 pr-4 font-mono text-white text-sm">{formatPrice(product.our_price)}</td>
      <td className="py-3 pr-4">
        <div className="font-mono text-white text-sm">{formatPrice(product.min_competitor_price)}</div>
        {delta !== null && delta > 0 && (
          <div className="text-xs text-orange-400 mt-0.5">+{formatPrice(delta)}</div>
        )}
      </td>
      <td className="py-3 pr-4">
        <StatusBadge status={product.status} />
      </td>
      <td className="py-3 pr-4 text-white/30 text-xs">{formatRelativeTime(product.last_checked_at)}</td>
      <td className="py-3 pr-4">
        <button
          onClick={() => onToggleReprice(!autoReprice)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            autoReprice ? "bg-white" : "bg-white/10"
          }`}
          title={autoReprice ? "Авто-снижение активно" : "Авто-снижение отключено"}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform ${
              autoReprice ? "translate-x-4.5 bg-black" : "translate-x-0.5 bg-white/40"
            }`}
          />
        </button>
      </td>
      <td className="py-3">
        <div className="flex items-center gap-1">
          <button
            onClick={onScan}
            disabled={isScanning}
            className="p-1.5 text-white/30 hover:text-white hover:bg-white/[.06] rounded transition-colors disabled:opacity-50"
            title="Сканировать сейчас"
          >
            {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-white/20 hover:text-red-400 hover:bg-white/[.06] rounded transition-colors"
            title="Удалить"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
