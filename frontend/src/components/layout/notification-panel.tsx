import { X, Bell, CheckCheck } from "lucide-react";
import { useNotificationStore } from "@/stores/notification-store";
import { notificationsApi } from "@/api/notifications";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types";

const TYPE_COLORS: Record<string, string> = {
  price_updated:  "bg-green-400",
  floor_reached:  "bg-yellow-400",
  scan_error:     "bg-red-500",
  login_required: "bg-red-500",
};

const TYPE_LABELS: Record<string, string> = {
  price_updated:  "Цена изменена",
  floor_reached:  "Мин. цена",
  scan_error:     "Ошибка сканирования",
  login_required: "Требуется вход",
};

function NotificationItem({ n }: { n: Notification }) {
  const { markRead } = useNotificationStore();

  const handleRead = async () => {
    markRead(n.id);
    try { await notificationsApi.markRead(n.id); } catch { /* ok */ }
  };

  const dot = TYPE_COLORS[n.type] ?? "bg-white/20";

  return (
    <div
      className={cn(
        "px-4 py-3 border-b border-white/[.04] hover:bg-white/[.02] cursor-pointer transition-colors",
        !n.is_read && "border-l border-l-white/20"
      )}
      onClick={handleRead}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dot)} />
          <span className="text-xs font-medium text-white/70">
            {TYPE_LABELS[n.type] ?? n.type}
          </span>
        </div>
        <span className="text-[10px] text-white/25 shrink-0">{formatRelativeTime(n.created_at)}</span>
      </div>
      <p className="text-sm text-white/50 mt-1 leading-snug pl-3">{n.message}</p>
    </div>
  );
}

export function NotificationPanel() {
  const { notifications, panelOpen, setPanelOpen, markAllRead } = useNotificationStore();

  const handleMarkAll = async () => {
    markAllRead();
    try { await notificationsApi.markAllRead(); } catch { /* ok */ }
  };

  if (!panelOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={() => setPanelOpen(false)}
      />
      <aside className="fixed right-0 top-0 h-full w-80 bg-[#0a0a0a] border-l border-white/[.06] z-50 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[.06]">
          <div className="flex items-center gap-2">
            <Bell className="h-3.5 w-3.5 text-white/40" />
            <span className="font-semibold text-sm text-white">Уведомления</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleMarkAll}
              className="p-1.5 text-white/30 hover:text-white hover:bg-white/[.06] rounded transition-colors"
              title="Отметить все прочитанными"
            >
              <CheckCheck className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setPanelOpen(false)}
              className="p-1.5 text-white/30 hover:text-white hover:bg-white/[.06] rounded transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-white/20 text-sm gap-2">
              <Bell className="h-6 w-6" />
              Нет уведомлений
            </div>
          ) : (
            notifications.map((n) => <NotificationItem key={n.id} n={n} />)
          )}
        </div>
      </aside>
    </>
  );
}
