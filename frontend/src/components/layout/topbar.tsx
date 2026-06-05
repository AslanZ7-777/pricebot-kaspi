import { Bell, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useNotificationStore } from "@/stores/notification-store";
import { useWsStore } from "@/stores/ws-store";

export function Topbar() {
  const { unreadCount, setPanelOpen } = useNotificationStore();
  const { status } = useWsStore();

  const wsConnected = status === "connected";
  const wsReconnecting = status === "reconnecting";

  return (
    <header className="h-11 bg-black border-b border-white/[.06] flex items-center justify-end px-4 gap-3 shrink-0">
      <div className="flex items-center gap-1.5 text-xs text-white/30">
        <div className={`h-1.5 w-1.5 rounded-full ${wsConnected ? "bg-green-400" : wsReconnecting ? "bg-yellow-400 animate-pulse" : "bg-white/20"}`} />
        <span className="hidden sm:inline">
          {wsConnected ? "Real-time" : wsReconnecting ? "Переподключение" : "Офлайн"}
        </span>
      </div>

      <button
        onClick={() => setPanelOpen(true)}
        className="relative p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/[.06] transition-colors"
        title="Уведомления"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-3.5 min-w-3.5 px-0.5 rounded-full bg-white text-black text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    </header>
  );
}
