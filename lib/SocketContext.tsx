'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

interface ChatData {
  userId: string;
  agentId: string | null;
  conversationId: string;
  officeId?: string;
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

  // Tracking de chats pendientes para detectar nuevos
  const pendingChatsRef = useRef<Set<string>>(new Set());

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
      // Para otros roles autorizados, solo registrar en consola, sin mostrar toast
      else if (hasAuthorizedRole) {
        console.log(`Error de conexión para ${agentRole}: ${error.message}`);
      }
    }

    function onDisconnect(reason: string) {
      setIsConnected(false);

      // Manejar desconexiones de manera silenciosa para todos los roles
      console.log(`Desconexión del socket (${agentRole}): ${reason}`);
    }

    // Detectar nuevos chats en pendientes
    function onActiveChats(chats: ChatData[]) {
      if (Array.isArray(chats) && hasAuthorizedRole) {
        const newPendingChats = chats.filter(chat => !chat.agentId); // Chats sin agente = pendientes
        const currentPending = pendingChatsRef.current;

        // Verificar si hay chats nuevos en pendientes
        newPendingChats.forEach(chat => {
          if (!currentPending.has(chat.userId)) {
            // Este es un chat nuevo en pendientes - mostrar notificación
            toast.info(`Nuevo chat pendiente de ${chat.userId}`, {
              description: 'Un nuevo usuario solicita soporte',
              action: {
                label: 'Ver',
                onClick: () => {
                  // Aquí se podría agregar lógica para navegar al chat
                  console.log('Navegando al chat pendiente:', chat.userId);
                }
              }
            });
            console.log('🔔 Nuevo chat pendiente detectado:', chat.userId);
          }
        });

        // Actualizar el tracking de chats pendientes
        pendingChatsRef.current = new Set(newPendingChats.map(chat => chat.userId));
      }
    }

    // Detectar chats que se mueven a pendientes por reapertura automática
    function onChatUnarchived(data: { conversationId: string; chat?: { userId: string; agentId: string | null; conversationId: string } }) {
      if (data.chat && !data.chat.agentId && hasAuthorizedRole) {
        // Chat reabierto automáticamente y movido a pendientes
        toast.info(`Chat reabierto: ${data.chat.userId}`, {
          description: 'El usuario ha enviado un nuevo mensaje',
          action: {
            label: 'Ver',
            onClick: () => {
              console.log('Navegando al chat reabierto:', data.chat?.userId);
            }
          }
        });
        console.log('🔔 Chat reabierto y movido a pendientes:', data.chat.userId);

        // Agregar al tracking
        pendingChatsRef.current.add(data.chat.userId);
      }
    }

    // Register event listeners
    socketInstance.on('connect', onConnect);
    socketInstance.on('connect_error', onConnectError);
    socketInstance.on('disconnect', onDisconnect);
    socketInstance.on('activeChats', onActiveChats);
    socketInstance.on('chatUnarchived', onChatUnarchived);

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
      socketInstance.off('activeChats', onActiveChats);
      socketInstance.off('chatUnarchived', onChatUnarchived);
      socketInstance.disconnect();
    };
  }, [user, agentId, agentName, agentRole, hasAuthorizedRole, isSuperadmin, connectionAttempts, disableSocketForSuperadmin, isConnected]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};