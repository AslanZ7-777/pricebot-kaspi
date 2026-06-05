import { useCallback } from "react";
import { toast } from "sonner";
import { useWebSocket } from "./use-websocket";
import { useNotificationStore } from "@/stores/notification-store";
import { queryClient } from "@/lib/query-client";
import { productKeys, dashboardKeys, notificationKeys } from "@/lib/query-keys";
import type { WsEvent, Notification } from "@/types";

const recentToasts = new Map<string, number>();
const TOAST_DEDUP_MS = 5000;

export function useWsEvents() {
  const { addNotification } = useNotificationStore();

  const onEvent = useCallback(
    (event: WsEvent) => {
      const productId = event.product_id;

      // Create a synthetic notification object for the store
      const notif: Notification = {
        id: event.notification_id ?? crypto.randomUUID(),
        product_id: productId ?? null,
        type: event.type as Notification["type"],
        message: event.message ?? event.type,
        payload: event.payload ?? null,
        is_read: false,
        created_at: event.created_at,
      };
      addNotification(notif);

      // Invalidate relevant queries
      if (productId) {
        queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
        queryClient.invalidateQueries({ queryKey: productKeys.snapshots(productId) });
        queryClient.invalidateQueries({ queryKey: productKeys.changes(productId) });
      }
      queryClient.invalidateQueries({ queryKey: dashboardKeys.summary });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });

      if (event.type === "scan_complete") return; // no toast — too noisy

      // Dedup toasts per product
      const dedupKey = `${event.type}:${productId}`;
      const lastToast = recentToasts.get(dedupKey) ?? 0;
      if (Date.now() - lastToast < TOAST_DEDUP_MS) return;
      recentToasts.set(dedupKey, Date.now());

      const msg = event.message ?? event.type;

      switch (event.type) {
        case "price_updated":
          toast.success(msg, { duration: 4000 });
          break;
        case "floor_reached":
          toast.warning(msg, { duration: 5000 });
          break;
        case "scan_error":
          toast.error(msg, { duration: 5000 });
          break;
        case "login_required":
          toast.error(msg, {
            duration: 0,
            action: { label: "Настройки", onClick: () => window.location.assign("/settings") },
          });
          break;
        default:
          toast.info(msg, { duration: 3000 });
      }
    },
    [addNotification]
  );

  useWebSocket(onEvent);
}
