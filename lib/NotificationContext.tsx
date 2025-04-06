'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useSocket } from './SocketContext';
import { useAuth } from '@/hooks/useAuth';

// Definir la interfaz para los mensajes de chat
interface ChatMessage {
  sender: string;
  userId: string;
  message: string;
  timestamp?: string;
  conversationId?: string;
}

interface NotificationContextType {
  unreadMessages: number;
  unreadChats: number;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadMessages: 0,
  unreadChats: 0,
  clearNotifications: () => {}
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadChats, setUnreadChats] = useState(0);
  const { socket } = useSocket();
  const pathname = usePathname();
  const { user } = useAuth();
  
  // Verificar si el usuario tiene un rol autorizado para recibir notificaciones
  const hasAuthorizedRole = user?.role === 'admin' || user?.role === 'operador' || user?.role === 'superadmin' || user?.role === 'encargado';

  // Limpiar notificaciones cuando se navega a la página de chat
  useEffect(() => {
    if (pathname === '/dashboard/chat') {
      clearNotifications();
    }
  }, [pathname]);

  // Escuchar eventos de socket para nuevos mensajes y chats
  useEffect(() => {
    // Si el socket no existe o el usuario no tiene un rol autorizado, no hacer nada
    if (!socket || !hasAuthorizedRole) return;

    function onNewMessage(message: ChatMessage) {
      if (message.sender === 'client') {
        // Solo incrementar si no estamos en la página de chat
        if (pathname !== '/dashboard/chat') {
          setUnreadMessages(prev => prev + 1);
        }
      }
    }

    function onNewConversation() {
      // Solo incrementar si no estamos en la página de chat
      if (pathname !== '/dashboard/chat') {
        setUnreadChats(prev => prev + 1);
      }
    }

    socket.on('newMessage', onNewMessage);
    socket.on('newConversation', onNewConversation);

    return () => {
      socket.off('newMessage', onNewMessage);
      socket.off('newConversation', onNewConversation);
    };
  }, [socket, pathname, hasAuthorizedRole]);

  const clearNotifications = () => {
    setUnreadMessages(0);
    setUnreadChats(0);
  };

  return (
    <NotificationContext.Provider value={{ unreadMessages, unreadChats, clearNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};