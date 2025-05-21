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

// Determinar la URL del socket según el entorno
const getSocketUrl = (): string => {
  // Verificar si estamos en entorno local
  const isLocal = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // URL de producción
  const prodUrl = 'https://backoffice-casino-back-production.up.railway.app';

  // Si estamos en local y existe la variable de entorno, usar esa
  if (isLocal && process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  }

  // Por defecto, usar la URL de producción
  return prodUrl;
};

// Socket configuration
const createSocket = (): Socket => {
  const socketUrl = getSocketUrl();
  console.log(`Conectando socket a: ${socketUrl}`);

  return io(socketUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 60000,
    forceNew: true,
  });
};

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [disableSocketForSuperadmin, setDisableSocketForSuperadmin] = useState(false);

  // Verificar si el usuario tiene un rol autorizado para recibir notificaciones
  const hasAuthorizedRole = user?.role === 'admin' || user?.role === 'operador' || user?.role === 'superadmin' || user?.role === 'encargado';
  const isSuperadmin = user?.role === 'superadmin';

  const agentId = user?.id || 'guest';
  const agentName = user?.name || 'Agente sin nombre';
  const agentRole = user?.role || 'guest';

  useEffect(() => {
    // Only initialize socket if we have a user
    if (!user) return;

    // Si es superadmin y ya hemos intentado conectar 3 veces sin éxito, desactivar el socket
    if (isSuperadmin && connectionAttempts >= 3 && !isConnected) {
      console.log('Superadmin: desactivando conexión de socket después de múltiples intentos fallidos');
      setDisableSocketForSuperadmin(true);
      return;
    }

    // Si es superadmin y hemos decidido desactivar el socket, no intentar conectar
    if (isSuperadmin && disableSocketForSuperadmin) {
      console.log('Superadmin: socket desactivado para mejorar experiencia de usuario');
      return;
    }

    const socketInstance = createSocket();
    setSocket(socketInstance);

    function onConnect() {
      setIsConnected(true);
      setConnectionAttempts(0); // Resetear contador de intentos al conectar
      console.log('Socket conectado exitosamente');

      // Join as agent with more complete information
      socketInstance.emit('joinAgent', {
        agentId,
        agentName,
        agentRole,
        officeId: user?.officeId
      });

      // Request current chats after connection with proper filtering
      socketInstance.emit('getActiveChats', {
        officeId: user?.officeId,
        agentId
      });
      socketInstance.emit('getArchivedChats', {
        officeId: user?.officeId,
        agentId
      });
      socketInstance.emit('getConnectedUsers');
    }

    function onConnectError(error: Error) {
      console.error('Error de conexión socket:', error);
      setIsConnected(false);
      setConnectionAttempts(prev => prev + 1);

      // Para superadmin, manejar errores de manera silenciosa
      if (isSuperadmin) {
        console.log(`Superadmin: error de conexión al socket (intento ${connectionAttempts + 1}/3), reintentando silenciosamente`);

        // Si este es el 3er intento, desactivar el socket para superadmin
        if (connectionAttempts >= 2) {
          setDisableSocketForSuperadmin(true);
        }
      }
      // Para otros roles autorizados, mostrar error 
      else if (hasAuthorizedRole) {
        toast.error(`Error de conexión: ${error.message}`);
      }
    }

    function onDisconnect(reason: string) {
      setIsConnected(false);

      // Para superadmin, manejar desconexiones de manera silenciosa
      if (isSuperadmin) {
        console.log('Superadmin: desconexión del socket, reintentando silenciosamente');
      }
      // Para otros roles, mostrar toast si es relevante
      else if (reason !== 'io client disconnect' && hasAuthorizedRole) {
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
  }, [user, agentId, agentName, agentRole, hasAuthorizedRole, isSuperadmin, connectionAttempts, disableSocketForSuperadmin, isConnected]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};