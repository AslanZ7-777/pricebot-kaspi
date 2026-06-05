import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { sessionApi } from "@/api/dashboard";
import { sessionKeys } from "@/lib/query-keys";
import { formatDateTime } from "@/lib/utils";
import { Loader2, CheckCircle, XCircle, LogIn, LogOut } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { data: session, isLoading } = useQuery({
    queryKey: sessionKeys.status,
    queryFn: sessionApi.getStatus,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const loginMutation = useMutation({
    mutationFn: sessionApi.login,
    onSuccess: () => toast.success("Попытка авторизации запущена в фоне"),
    onError: () => toast.error("Не удалось запустить авторизацию"),
  });

  const logoutMutation = useMutation({
    mutationFn: sessionApi.logout,
    onSuccess: () => toast.success("Сессия очищена"),
    onError: () => toast.error("Ошибка при выходе"),
  });

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h1 className="text-lg font-semibold text-white">Настройки</h1>
        <p className="text-sm text-white/30 mt-0.5">Управление подключением к Kaspi.kz</p>
      </div>

      <div className="bg-white/[.02] border border-white/[.06] rounded-xl p-5">
        <h2 className="text-sm font-medium text-white mb-4">Сессия Omarket.kz</h2>

        {isLoading ? (
          <div className="flex items-center gap-2 text-white/30 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Загрузка...
          </div>
        ) : session ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`h-2 w-2 rounded-full ${session.is_valid ? "bg-green-400" : "bg-red-400"}`} />
              <div>
                <p className={`font-medium text-sm ${session.is_valid ? "text-white" : "text-white/50"}`}>
                  {session.is_valid ? "Авторизован" : "Не авторизован"}
                </p>
                {session.account_login && (
                  <p className="text-xs text-white/30">{session.account_login}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-white/25 mb-0.5">Последний вход</p>
                <p className="text-white/60 text-xs">{formatDateTime(session.last_login_at)}</p>
              </div>
              <div>
                <p className="text-xs text-white/25 mb-0.5">Последнее использование</p>
                <p className="text-white/60 text-xs">{formatDateTime(session.last_used_at)}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => loginMutation.mutate()}
                disabled={loginMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors disabled:opacity-40"
              >
                {loginMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />}
                {session.is_valid ? "Обновить сессию" : "Войти"}
              </button>

              {session.is_valid && (
                <button
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 text-sm border border-white/[.08] hover:border-white/20 text-white/50 hover:text-white rounded-lg transition-colors disabled:opacity-40"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Выйти
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="bg-white/[.02] border border-white/[.06] rounded-xl p-5">
        <h2 className="text-sm font-medium text-white mb-3">Учётные данные</h2>
        <p className="text-sm text-white/40">
          Логин и пароль задаются в файле <code className="text-white/70 bg-white/[.06] px-1.5 py-0.5 rounded text-xs">.env</code> в корне проекта:
        </p>
        <pre className="mt-3 bg-white/[.04] border border-white/[.04] rounded-lg px-4 py-3 text-xs text-white/60 overflow-x-auto">
{`OMARKET_LOGIN=ваш_логин
OMARKET_PASSWORD=ваш_пароль`}
        </pre>
        <p className="text-xs text-white/20 mt-2">
          После изменения .env необходимо перезапустить backend.
        </p>
      </div>
    </div>
  );
}
