import { create } from "zustand";
import type { Notification } from "@/types";

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  panelOpen: boolean;
  addNotification: (n: Notification) => void;
  setNotifications: (items: Notification[], unreadCount: number) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  setPanelOpen: (open: boolean) => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  unreadCount: 0,
  panelOpen: false,

  addNotification: (n) =>
    set((state) => ({
      notifications: [n, ...state.notifications].slice(0, 100),
      unreadCount: state.unreadCount + (n.is_read ? 0 : 1),
    })),

  setNotifications: (items, unreadCount) =>
    set({ notifications: items, unreadCount }),

  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - (state.notifications.find((n) => n.id === id && !n.is_read) ? 1 : 0)),
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    })),

  setPanelOpen: (open) => set({ panelOpen: open }),
}));
