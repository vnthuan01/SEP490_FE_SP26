import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { HubConnection } from '@microsoft/signalr';
import { getSignalRConnection, startSignalRConnection } from '@/lib/signalrClient';

interface SignalRContextValue {
  connection: HubConnection | null;
  connectionId: string | null;
  isConnected: boolean;
}

const SignalRContext = createContext<SignalRContextValue | null>(null);

interface SignalRProviderProps {
  children: ReactNode;
}

export function SignalRProvider({ children }: SignalRProviderProps) {
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const connection = useMemo(() => getSignalRConnection(), []);

  useEffect(() => {
    let isMounted = true;
    const conn = connection;

    startSignalRConnection()
      .then(async () => {
        if (!isMounted) return;
        setIsConnected(true);
        try {
          const id = await conn.invoke<string>('GetConnectionId');
          if (isMounted) setConnectionId(id);
        } catch (err) {
          console.error('Failed to get connection id', err);
        }
      })
      .catch((err) => {
        console.error('SignalR connect failed', err);
      });

    conn.onreconnected(() => setIsConnected(true));
    conn.onreconnecting(() => setIsConnected(false));
    conn.onclose(() => setIsConnected(false));

    return () => {
      isMounted = false;
      conn.stop().catch(() => {});
    };
  }, [connection]);

  const value = useMemo<SignalRContextValue>(
    () => ({
      connection,
      connectionId,
      isConnected,
    }),
    [connection, connectionId, isConnected],
  );

  return <SignalRContext.Provider value={value}>{children}</SignalRContext.Provider>;
}

export function useSignalR() {
  const ctx = useContext(SignalRContext);
  if (!ctx) throw new Error('useSignalR must be used within SignalRProvider');
  return ctx;
}
