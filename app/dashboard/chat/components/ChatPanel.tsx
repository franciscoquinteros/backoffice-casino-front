'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import ChatInput from '../ChatInput';
import { Message, ChatData, MessageEndRef } from '../types';
import { Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, Archive } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ChatPanelProps {
  selectedChat: string | null;
  activeChats: ChatData[];
  archivedChats: ChatData[];
  messages: Message[];
  messagesEndRef: MessageEndRef;
  currentConversationId: string | null;
  socket: Socket;
  onSendMessage: (message: string) => void;
  onArchive: (userId: string) => void;
  isUserConnected: (userId: string) => boolean;
  isLoadingMessages: boolean;
}

export function ChatPanel({
  selectedChat,
  activeChats,
  archivedChats,
  messages,
  messagesEndRef,
  currentConversationId,
  socket,
  onSendMessage,
  onArchive,
  isUserConnected,
  isLoadingMessages
}: ChatPanelProps) {
  const { user } = useAuth();
  const currentAgentId = user?.id;

  // Verificar si el chat está asignado a otro agente
  const isAssignedToOtherAgent = () => {
    if (!selectedChat) return false;

    // Buscar en chats activos
    const activeChat = activeChats.find(chat => chat.chat_user_id === selectedChat);
    if (activeChat) {
      return activeChat.chat_agent_id && activeChat.chat_agent_id !== currentAgentId;
    }

    // Buscar en chats archivados
    const archivedChat = archivedChats.find(chat => chat.chat_user_id === selectedChat);
    if (archivedChat) {
      return archivedChat.chat_agent_id && archivedChat.chat_agent_id !== currentAgentId;
    }

    return false;
  };

  // Determinar si el chat está archivado
  const isChatArchived = () => {
    if (!selectedChat) return false;
    return archivedChats.some(chat => chat.chat_user_id === selectedChat);
  };

  // Verificar si el chat no está asignado al usuario actual
  const isNotAssignedToCurrentUser = () => {
    if (!selectedChat) return false;

    // Buscar en chats activos
    const activeChat = activeChats.find(chat => chat.chat_user_id === selectedChat);
    if (activeChat) {
      // Si está asignado pero no al usuario actual
      return activeChat.chat_agent_id && activeChat.chat_agent_id !== currentAgentId;
    }

    // Si no está en los chats activos, no está asignado al usuario actual
    return true;
  };

  // Skeleton para los mensajes
  const messagesListSkeleton = (
    <div className="flex-1 p-4 overflow-auto">
      <div className="space-y-4">
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] ${i % 2 === 0 ? 'mr-auto' : 'ml-auto'}`}>
              <Skeleton className={`h-20 w-64 rounded-lg ${i % 2 === 0 ? 'rounded-tl-none' : 'rounded-tr-none'}`} />
              <Skeleton className="h-3 w-24 mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Loading indicator para mensajes
  const messagesLoadingIndicator = (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground text-sm">Cargando mensajes...</p>
      </div>
    </div>
  );

  // Contenido principal cuando hay un chat seleccionado
  const chatContent = selectedChat ? (
    <>
      <ChatHeader
        selectedChat={selectedChat}
        activeChats={activeChats}
        onArchive={onArchive}
        isUserConnected={isUserConnected}
      />
      {isLoadingMessages ? (
        messagesLoadingIndicator
      ) : (
        <MessageList messages={messages} messagesEndRef={messagesEndRef} />
      )}
      {isAssignedToOtherAgent() ? (
        <div className="p-4 bg-amber-50 dark:bg-amber-950 border-t text-amber-800 dark:text-amber-200 text-sm rounded-b-xl">
          <AlertTriangle className="h-4 w-4 inline-block mr-2" />
          No puedes enviar mensajes a este chat ya que está asignado a otro agente.
        </div>
      ) : isChatArchived() ? (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t text-gray-500 text-sm">
          <Archive className="h-4 w-4 inline-block mr-2" />
          Esta conversación está archivada. No puedes enviar mensajes.
        </div>
      ) : isNotAssignedToCurrentUser() ? (
        <div className="p-4 bg-amber-50 dark:bg-amber-950 border-t text-amber-800 dark:text-amber-200 text-sm rounded-b-xl">
          <AlertTriangle className="h-4 w-4 inline-block mr-2" />
          Para enviar mensajes a este chat, primero debes asignar el chat a ti.
        </div>
      ) : (
        <ChatInput
          chatId={selectedChat}
          socket={socket}
          conversationId={currentConversationId || undefined}
          onSendMessage={onSendMessage}
        />
      )}
    </>
  ) : (
    <div className="h-full flex items-center justify-center text-muted-foreground">
      Selecciona un chat para comenzar
    </div>
  );

  return (
    <Card className="flex-1 flex flex-col">
      {chatContent}
    </Card>
  );
}