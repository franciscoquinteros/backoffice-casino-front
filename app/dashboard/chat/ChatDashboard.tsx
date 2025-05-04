'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from './hooks/useSocket';
import { useChatState } from './hooks/useChatState';
import { useMessages } from './hooks/useMessages';
import { ChatList } from './components/ChatList';
import { ChatPanel } from './components/ChatPanel';
import { Socket } from 'socket.io-client';
import { SkeletonLoader } from '@/components/skeleton-loader';
import { ChatConnectionError } from './components/ChatConnectionError';

export default function ChatDashboard() {
  // Get authentication context
  const { user, isAuthenticated } = useAuth();
  const agentId = user?.id || 'guest';
  const userOffice = user?.officeId; // Get the user's office ID

  // Initialize socket connection
  const { socket, isConnected, isLoading, error } = useSocket();

  const {
    activeChats,
    pendingChats,
    archivedChats,
    selectedChat,
    selectedTab,
    currentConversationId,
    assigningChat,
    setSelectedTab,
    selectChat,
    assignToMe,
    archiveChat,
    unarchiveChat,
    getUsernameById,
    isUserConnected
  } = useChatState({
    socket: socket as Socket,
    agentId,
    isConnected,
    agentName: user?.name,
    userOffice // Pass the user's office
  });

  // Initialize messages
  const {
    messages,
    sendMessage,
    messagesEndRef,
  } = useMessages({
    socket: socket as Socket,
    selectedChat,
    currentConversationId,
    agentId
  });

  // Si hay un error de conexión, mostramos el componente de error
  if (error || !socket) {
    return <ChatConnectionError error={error} />;
  }

  // Contenido principal del dashboard
  const dashboardContent = (
    <div className="flex flex-col md:flex-row h-[calc(100vh-180px)] gap-2 sm:gap-4">
      <ChatList
        activeChats={activeChats}
        pendingChats={pendingChats}
        archivedChats={archivedChats}
        selectedChat={selectedChat}
        selectedTab={selectedTab}
        assigningChat={assigningChat}
        isAuthenticated={isAuthenticated}
        getUsernameById={getUsernameById}
        setSelectedTab={setSelectedTab}
        selectChat={selectChat}
        assignToMe={assignToMe}
        archiveChat={archiveChat}
        unarchiveChat={unarchiveChat}
        isUserConnected={isUserConnected}
      />

      <ChatPanel
        selectedChat={selectedChat}
        activeChats={activeChats}
        archivedChats={archivedChats}
        messages={messages}
        messagesEndRef={messagesEndRef}
        currentConversationId={currentConversationId}
        socket={socket}
        onSendMessage={sendMessage}
        onArchive={archiveChat}
        isUserConnected={isUserConnected}
      />
    </div>
  );

  // Pantalla de carga mientras se establece la conexión
  const connectionLoader = (
    <div className="flex h-[calc(100vh-180px)] items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Conectando al servidor de chat...</p>
      </div>
    </div>
  );

  return (
    <SkeletonLoader
      isLoading={isLoading}
      skeleton={connectionLoader}
    >
      {dashboardContent}
    </SkeletonLoader>
  );
}