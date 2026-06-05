import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { ProductsTable } from "@/components/products/products-table";
import { AddProductDialog } from "@/components/products/add-product-dialog";
import { productsApi } from "@/api/products";

export const Route = createFileRoute("/products/")({
  component: ProductsPage,
});

const STATUS_OPTIONS = [
  { value: null,       label: "Все" },
  { value: "winning",  label: "Побеждаем" },
  { value: "losing",   label: "Проигрываем" },
  { value: "floor",    label: "Мин. цена" },
  { value: "error",    label: "Ошибки" },
];

function ProductsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [scanningAll, setScanningAll] = useState(false);

  const handleScanAll = async () => {
    setScanningAll(true);
    try {
      await productsApi.scanAll();
      toast.success("Сканирование всех товаров запущено");
    } catch {
      toast.error("Не удалось запустить сканирование");
    } finally {
      setScanningAll(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Товары</h1>
          <p className="text-sm text-white/30 mt-0.5">Управление мониторингом цен на Kaspi.kz</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleScanAll}
            disabled={scanningAll}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/60 border border-white/[.08] hover:border-white/20 hover:text-white rounded-lg transition-colors disabled:opacity-40"
          >
            <ScanLine className="h-3.5 w-3.5" />
            {scanningAll ? "Запуск..." : "Сканировать все"}
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Добавить товар
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию или URL..."
          className="flex-1 max-w-xs bg-white/[.04] border border-white/[.06] rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
        />
        <div className="flex gap-1">
          {STATUS_OPTIONS.map(({ value, label }) => (
            <button
              key={String(value)}
              onClick={() => setStatusFilter(value)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors border ${
                statusFilter === value
                  ? "border-white/20 bg-white/[.06] text-white"
                  : "border-white/[.06] text-white/40 hover:text-white hover:border-white/20"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white/[.02] border border-white/[.06] rounded-xl p-4">
        <ProductsTable search={search} statusFilter={statusFilter} />
      </div>

      {addOpen && <AddProductDialog onClose={() => setAddOpen(false)} />}
    </div>
  );
}
