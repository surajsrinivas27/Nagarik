import { useEffect, useRef, useState } from 'react';

export interface WSEvent {
  event: 'new_complaint' | 'status_update';
  data: any;
}

export const useWebSocket = (url: string = 'ws://localhost:8000/ws/dashboard', onMessage?: (evt: WSEvent) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let ws: WebSocket;
    let pingInterval: any;

    const connect = () => {
      try {
        ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send('ping');
            }
          }, 20000);
        };

        ws.onmessage = (e) => {
          if (e.data === 'pong') return;
          try {
            const parsed: WSEvent = JSON.parse(e.data);
            if (onMessage) {
              onMessage(parsed);
            }
          } catch (err) {
            console.error('WebSocket parse error:', err);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          clearInterval(pingInterval);
          // Try reconnect after 3 seconds
          setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          setIsConnected(false);
        };
      } catch (e) {
        console.error('WebSocket connection error:', e);
      }
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (pingInterval) clearInterval(pingInterval);
    };
  }, [url]);

  return { isConnected };
};
