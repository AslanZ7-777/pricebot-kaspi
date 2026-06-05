import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { productsApi } from "@/api/products";
import { productKeys } from "@/lib/query-keys";
import type { Product } from "@/types";

interface Props {
  product: Product;
}

export function RepriceConfigForm({ product }: Props) {
  const qc = useQueryClient();
  const config = product.config;

  const [step, setStep] = useState(String(config?.step ?? 100));
  const [floorPrice, setFloorPrice] = useState(String(config?.floor_price ?? ""));
  const [interval, setInterval] = useState(String(config?.check_interval_minutes ?? 30));
  const [autoReprice, setAutoReprice] = useState(config?.auto_reprice ?? true);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (config) {
      setStep(String(config.step));
      setFloorPrice(String(config.floor_price));
      setInterval(String(config.check_interval_minutes));
      setAutoReprice(config.auto_reprice);
      setDirty(false);
    }
  }, [config?.step, config?.floor_price, config?.check_interval_minutes, config?.auto_reprice]);

  const mutation = useMutation({
    mutationFn: () =>
      productsApi.updateConfig(product.id, {
        step: parseFloat(step),
        floor_price: parseFloat(floorPrice),
        check_interval_minutes: parseInt(interval),
        auto_reprice: autoReprice,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.detail(product.id) });
      toast.success("Настройки сохранены");
      setDirty(false);
    },
    onError: (e: Error) => toast.error(e.message ?? "Ошибка сохранения"),
  });

  const handleChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setDirty(true);
  };

  const inputClass = "w-full bg-white/[.04] border border-white/[.06] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20 transition-colors";

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
      {dirty && (
        <div className="border border-yellow-400/20 bg-yellow-400/[.04] rounded-lg px-3 py-2 text-xs text-yellow-400/80">
          Есть несохранённые изменения
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-white/35 mb-1.5">Шаг снижения, ₸</label>
          <input type="number" value={step} onChange={handleChange(setStep)} min={1} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-white/35 mb-1.5">Мин. цена, ₸</label>
          <input type="number" value={floorPrice} onChange={handleChange(setFloorPrice)} min={0} className={inputClass} />
        </div>
      </div>

      <div>
        <label className="block text-xs text-white/35 mb-1.5">Интервал проверки, мин</label>
        <input type="number" value={interval} onChange={handleChange(setInterval)} min={5} max={1440} className={inputClass} />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-white/60">Авто-снижение цены</span>
        <button
          type="button"
          onClick={() => { setAutoReprice(!autoReprice); setDirty(true); }}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            autoReprice ? "bg-white" : "bg-white/10"
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform ${
              autoReprice ? "translate-x-4.5 bg-black" : "translate-x-0.5 bg-white/30"
            }`}
          />
        </button>
      </div>

      <button
        type="submit"
        disabled={mutation.isPending || !dirty}
        className="w-full px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-colors disabled:opacity-30"
      >
        {mutation.isPending ? "Сохранение..." : "Сохранить настройки"}
      </button>
    </form>
  );
}
