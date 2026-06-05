import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Plus } from "lucide-react";
import { productsApi } from "@/api/products";
import { productKeys } from "@/lib/query-keys";

interface Props {
  onClose: () => void;
}

export function AddProductDialog({ onClose }: Props) {
  const qc = useQueryClient();
  const [url, setUrl] = useState("");
  const [floorPrice, setFloorPrice] = useState("");
  const [step, setStep] = useState("100");

  const mutation = useMutation({
    mutationFn: () =>
      productsApi.create({
        omarket_url: url.trim(),
        floor_price: parseFloat(floorPrice),
        step: parseFloat(step),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.all });
      toast.success("Товар добавлен");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message ?? "Ошибка при добавлении"),
  });

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0a0a0a] border border-white/[.08] rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[.06]">
          <h2 className="font-semibold text-sm text-white">Добавить товар</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
          className="p-5 space-y-4"
        >
          <div>
            <label className="block text-xs text-white/50 mb-1.5 font-medium">URL карточки товара на Kaspi.kz</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://kaspi.kz/shop/p/..."
              required
              className="w-full bg-white/[.04] border border-white/[.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium">Минимальная цена, ₸</label>
              <input
                type="number"
                value={floorPrice}
                onChange={(e) => setFloorPrice(e.target.value)}
                placeholder="0"
                required
                min={0}
                className="w-full bg-white/[.04] border border-white/[.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium">Шаг снижения, ₸</label>
              <input
                type="number"
                value={step}
                onChange={(e) => setStep(e.target.value)}
                placeholder="100"
                required
                min={1}
                className="w-full bg-white/[.04] border border-white/[.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-white/40 hover:text-white transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 text-sm bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors disabled:opacity-40 flex items-center gap-2"
            >
              <Plus className="h-3.5 w-3.5" />
              {mutation.isPending ? "Добавление..." : "Добавить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
