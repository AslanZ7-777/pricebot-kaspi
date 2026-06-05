import { Outlet } from "@tanstack/react-router";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { NotificationPanel } from "./notification-panel";
import { useWsEvents } from "@/hooks/use-ws-events";

export function AppShell() {
  useWsEvents();

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <NotificationPanel />
    </div>
  );
}
