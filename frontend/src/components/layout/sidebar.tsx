import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Package, Settings, BarChart3, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { to: "/dashboard", label: "Дашборд",   icon: LayoutDashboard },
  { to: "/products",  label: "Товары",    icon: Package },
  { to: "/analytics", label: "Аналитика", icon: BarChart3 },
  { to: "/settings",  label: "Настройки", icon: Settings },
];

export function Sidebar() {
  const { location } = useRouterState();

  return (
    <aside className="w-56 bg-black border-r border-white/[.06] flex flex-col py-4 shrink-0">
      {/* Logo */}
      <div className="px-4 mb-6">
        <div className="flex items-center gap-2 mb-0.5">
          <Zap className="h-4 w-4 text-white" />
          <span className="font-semibold text-sm text-white tracking-tight">PriceBot</span>
        </div>
        <p className="text-[10px] text-white/30 pl-6">для Kaspi.kz</p>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-2">
        {links.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to || location.pathname.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-white/[.08] text-white font-medium"
                  : "text-white/50 hover:text-white hover:bg-white/[.04]"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom info */}
      <div className="mt-auto px-4 pt-4 border-t border-white/[.06]">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
          <span className="text-[10px] text-white/30">Мониторинг активен</span>
        </div>
      </div>
    </aside>
  );
}
