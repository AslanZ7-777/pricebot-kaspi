import { cn } from "@/lib/utils";

type Status = "winning" | "losing" | "floor" | "error" | "unknown" | null;

const CONFIG: Record<NonNullable<Status>, { label: string; dot: string }> = {
  winning: { label: "Побеждаем",    dot: "bg-green-400" },
  losing:  { label: "Проигрываем", dot: "bg-orange-400" },
  floor:   { label: "Мин. цена",   dot: "bg-yellow-400" },
  error:   { label: "Ошибка",      dot: "bg-red-500" },
  unknown: { label: "Неизвестно",  dot: "bg-white/20" },
};

interface Props {
  status: Status;
}

export function StatusBadge({ status }: Props) {
  const cfg = CONFIG[status ?? "unknown"];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-white/60 font-medium">
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}
