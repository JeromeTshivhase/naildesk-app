import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NotifType = "DEPOSIT_RECEIVED" | "APPOINTMENT_CONFIRMED" | "APPOINTMENT_BOOKED";

export interface AppNotif {
  id: string;
  type: NotifType;
  message: string;
  appointmentId?: string;
  clientName?: string;
  read: boolean;
  createdAt: string;
}

interface NotifState {
  notifications: AppNotif[];
  unreadCount: number;
  add: (n: Omit<AppNotif, "id" | "read" | "createdAt"> & { id?: string; createdAt?: string }) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
}

const MAX = 30;

export const useNotifications = create<NotifState>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 0,

      add: (n) => set((s) => {
        if (n.id && s.notifications.some((x) => x.id === n.id)) return s;
        const item: AppNotif = {
          id: n.id ?? crypto.randomUUID(),
          type: n.type,
          message: n.message,
          appointmentId: n.appointmentId,
          clientName: n.clientName,
          read: false,
          createdAt: n.createdAt ?? new Date().toISOString(),
        };
        const next = [item, ...s.notifications].slice(0, MAX);
        return { notifications: next, unreadCount: next.filter((x) => !x.read).length };
      }),

      markRead: (id) => set((s) => {
        const next = s.notifications.map((x) => x.id === id ? { ...x, read: true } : x);
        return { notifications: next, unreadCount: next.filter((x) => !x.read).length };
      }),

      markAllRead: () => set((s) => ({
        notifications: s.notifications.map((x) => ({ ...x, read: true })),
        unreadCount: 0,
      })),

      clear: () => set({ notifications: [], unreadCount: 0 }),
    }),
    {
      name: "naildesk.notifications",
      version: 1,
      partialize: (s) => ({ notifications: s.notifications, unreadCount: s.unreadCount }),
    }
  )
);
