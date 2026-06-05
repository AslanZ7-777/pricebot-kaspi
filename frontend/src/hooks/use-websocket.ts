import { useEffect, useRef, useCallback } from "react";
import { useWsStore } from "@/stores/ws-store";
import type { WsEvent } from "@/types";

type EventHandler = (event: WsEvent) => void;

const MAX_RETRIES = 10;
const WS_URL = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws/events`;

export function useWebSocket(onEvent: EventHandler) {
  const wsRef = useRef<WebSocket | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);
  const intentionalClose = useRef(false);
  const { setStatus, setReconnectAttempts } = useWsStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      attemptsRef.current = 0;
      setReconnectAttempts(0);
      setStatus("connected");
    };

    ws.onmessage = (e) => {
      try {
        const event: WsEvent = JSON.parse(e.data);
        onEvent(event);
      } catch {
        // malformed message
      }
    };

    ws.onclose = (e) => {
      if (intentionalClose.current) {
        setStatus("disconnected");
        return;
      }
      if (attemptsRef.current >= MAX_RETRIES) {
        setStatus("failed");
        return;
      }
      const delay = Math.min(1000 * 2 ** attemptsRef.current, 30_000);
      attemptsRef.current++;
      setReconnectAttempts(attemptsRef.current);
      setStatus("reconnecting");
      retryTimerRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [onEvent, setStatus, setReconnectAttempts]);

  useEffect(() => {
    intentionalClose.current = false;
    connect();

    const onVisibilityChange = () => {
      if (!document.hidden && wsRef.current?.readyState !== WebSocket.OPEN) {
        attemptsRef.current = 0;
        connect();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      intentionalClose.current = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      wsRef.current?.close(1000);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [connect]);
}
