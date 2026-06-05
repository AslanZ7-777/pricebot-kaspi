import { apiClient } from "./client";
import type { Notification, NotificationListResponse } from "@/types";

export const notificationsApi = {
  list: (params: { page?: number; page_size?: number; unread_only?: boolean } = {}) =>
    apiClient.get<NotificationListResponse>("/notifications", { params }).then((r) => r.data),

  markRead: (id: string) =>
    apiClient.post<Notification>(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () =>
    apiClient.post("/notifications/read-all").then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/notifications/${id}`),
};
