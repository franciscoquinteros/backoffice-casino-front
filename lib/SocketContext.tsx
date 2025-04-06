'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import io, { Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

// Interfaces para los tipos de mensajes y conversaciones
interface ChatMessage {
  sender: string;
  userId: string;
  message: string;
  timestamp?: string;
  conversationId?: string;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false
});

export const useSocket = () => useContext(SocketContext);

// Socket configuration
const createSocket = (): Socket => {
  return io('https://backoffice-casino-back-production.up.railway.app', {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    forceNew: true,
  });
};

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  // Verificar si el usuario tiene un rol autorizado para recibir notificaciones
  const hasAuthorizedRole = user?.role === 'admin' || user?.role === 'operador' || user?.role === 'superadmin' || user?.role === 'encargado';

  const agentId = user?.id || 'guest';
  const agentName = user?.name || 'Agente sin nombre';
  const agentRole = user?.role || 'guest';

  useEffect(() => {
    // Only initialize socket if we have a user
    if (!user) return;

    const socketInstance = createSocket();
    setSocket(socketInstance);

    function onConnect() {
      setIsConnected(true);

      // Join as agent with more complete information
      socketInstance.emit('joinAgent', {
        agentId,
        agentName,
        agentRole
      });

      // Request current chats after connection
      socketInstance.emit('getActiveChats');
      socketInstance.emit('getArchivedChats');
      socketInstance.emit('getConnectedUsers');
    }

    function onConnectError(error: Error) {
      console.error('Error de conexión socket:', error);
      setIsConnected(false);

      // Only show error toast for authorized roles
      if (hasAuthorizedRole) {
        toast.error(`Error de conexión: ${error.message}`);
      }
    }

    function onDisconnect(reason: string) {
      setIsConnected(false);

      // Only show disconnect toast for authorized roles
      if (reason !== 'io client disconnect' && hasAuthorizedRole) {
        toast.error(`Se perdió la conexión con el servidor: ${reason}`);
      }
    }

    // Handle new messages globally
    function onNewMessage(message: ChatMessage) {
      // Only show notifications for authorized roles
      if (message.sender === 'client' && hasAuthorizedRole) {
        toast.info(`Nuevo mensaje de ${message.userId}`, {
          description: message.message.substring(0, 50) + (message.message.length > 50 ? '...' : '')
        });
      }
    }

    // Register event listeners
    socketInstance.on('connect', onConnect);
    socketInstance.on('connect_error', onConnectError);
    socketInstance.on('disconnect', onDisconnect);
    socketInstance.on('newMessage', onNewMessage);

    // Periodic ping to keep connection alive
    const pingInterval = setInterval(() => {
      if (socketInstance.connected) {
        socketInstance.emit('checkConnection');
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      socketInstance.off('connect', onConnect);
      socketInstance.off('connect_error', onConnectError);
      socketInstance.off('disconnect', onDisconnect);
      socketInstance.off('newMessage', onNewMessage);
      socketInstance.disconnect();
    };
  }, [user, agentId, agentName, agentRole, hasAuthorizedRole]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};