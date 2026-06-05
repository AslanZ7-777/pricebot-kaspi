import { create } from "zustand";

type WsStatus = "connecting" | "connected" | "reconnecting" | "disconnected" | "failed";

interface WsStore {
  status: WsStatus;
  reconnectAttempts: number;
  setStatus: (status: WsStatus) => void;
  setReconnectAttempts: (n: number) => void;
}

export const useWsStore = create<WsStore>((set) => ({
  status: "disconnected",
  reconnectAttempts: 0,
  setStatus: (status) => set({ status }),
  setReconnectAttempts: (n) => set({ reconnectAttempts: n }),
}));
