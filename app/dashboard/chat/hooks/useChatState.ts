import { useState, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { ChatData, User, ChatTab } from '../types';
import { useSession } from 'next-auth/react';

interface UseChatStateProps {
  socket: Socket;
  agentId: string;
  isConnected: boolean;
  agentName?: string | null;
}

interface UseChatStateReturn {
  activeChats: ChatData[];
  pendingChats: ChatData[];
  archivedChats: ChatData[];
  selectedChat: string | null;
  selectedTab: ChatTab;
  currentConversationId: string | null;
  assigningChat: string | null;
  users: User[];
  setSelectedChat: (userId: string | null) => void;
  setSelectedTab: (tab: ChatTab) => void;
  selectChat: (userId: string) => void;
  assignToMe: (userId: string, conversationId: string) => void;
  archiveChat: (userId: string) => void;
  unarchiveChat: (userId: string) => void;
  getUsernameById: (id: string | null) => string;
  connectedUsers: Set<string>;
  isUserConnected: (userId: string) => boolean;
}

export function useChatState({ socket, agentId, agentName }: UseChatStateProps): UseChatStateReturn {
  const [activeChats, setActiveChats] = useState<ChatData[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<Set<string>>(new Set());
  const [pendingChats, setPendingChats] = useState<ChatData[]>([]);
  const [archivedChats, setArchivedChats] = useState<ChatData[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<ChatTab>('active');
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [assigningChat, setAssigningChat] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const { data: session, status: sessionStatus } = useSession();

  const fetchUsers = useCallback(async () => {
    try {
      if (sessionStatus !== 'authenticated' || !session?.accessToken) {
        console.error('Cannot fetch users: Not authenticated or missing access token.');
        return;
      }

      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/users`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        console.error('Error fetching users:', response.status, response.statusText, await response.text());
        toast.error(`Error al obtener usuarios: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error de red al obtener usuarios.');
    }
  }, [sessionStatus, session]);

  const getUsernameById = useCallback((id: string | null) => {
    if (!id) return 'Sin asignar';
    const foundUser = users.find(user => user.id === id);
    return foundUser ? foundUser.username : id;
  }, [users]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (!socket) return;

    function onActiveChats(chats: { userId: string; agentId: string; conversationId: string }[]) {
      const active: ChatData[] = [];
      const pending: ChatData[] = [];

      if (Array.isArray(chats)) {
        chats.forEach(chat => {
          const mappedChat: ChatData = {
            chat_user_id: chat.userId,
            chat_agent_id: chat.agentId,
            conversationId: chat.conversationId
          };

          if (mappedChat.chat_agent_id) {
            active.push({
              ...mappedChat,
              status: 'active'
            });
          } else {
            pending.push({
              ...mappedChat,
              status: 'pending'
            });
          }
        });
      }
      setActiveChats(active);
      setPendingChats(pending);
    }

    function onArchivedChats(chats: { userId: string; agentId: string; conversationId: string }[]) {
      if (Array.isArray(chats)) {
        const mapped = chats.map(chat => ({
          chat_user_id: chat.userId,
          chat_agent_id: chat.agentId,
          conversationId: chat.conversationId,
          status: 'archived' as const
        }));
        setArchivedChats(mapped);
      } else {
        setArchivedChats([]);
      }
    }

    function onAgentAssigned(data: { userId: string; agentId: string; success: boolean; conversationId: string }) {
      if (data.success && data.agentId === agentId) {
        if (assigningChat !== data.userId) {
          socket.emit('getActiveChats');
        }

        if (selectedChat === data.userId) {
          socket.emit('selectConversation', {
            conversationId: data.conversationId,
            agentId
          });
        }
      }
    }

    function onAssignmentError(error: { message: string }) {
      console.error('Assignment error:', error);
      toast.error(`Error de asignación: ${error.message}`);
    }

    function onConnectionStatus(data: { type: 'user' | 'agent', id: string, status: 'connected' | 'disconnected' }) {
      if (data.type === 'user') {
        setConnectedUsers(prev => {
          const newSet = new Set(prev);
          if (data.status === 'connected') {
            newSet.add(data.id);
          } else {
            newSet.delete(data.id);
          }
          return newSet;
        });
      }
    }

    function onConnectedUsers(userIds: string[]) {
      console.log('Usuarios conectados recibidos:', userIds);
      setConnectedUsers(new Set(userIds));
    }

    function onChatArchived(data: { conversationId: string; chat?: { userId: string; agentId: string; conversationId: string } }) {
      console.log('Chat archivado:', data);
      
      if (data.chat && data.chat.userId) {
        const userId = data.chat.userId;
        const agentId = data.chat.agentId || null;
        const conversationId = data.chat.conversationId;
        
        setActiveChats(prev => prev.filter(chat => chat.chat_user_id !== userId));
        setArchivedChats(prev => [
          ...prev,
          {
            chat_user_id: userId,
            chat_agent_id: agentId,
            conversationId: conversationId,
            status: 'archived'
          }
        ]);
        
        if (selectedChat === userId) {
          setSelectedChat(null);
          toast.info(`El chat con Usuario ${userId} ha sido archivado`);
        }
        
        return;
      }
      
      const chatToArchive = activeChats.find(chat => chat.conversationId === data.conversationId);
      
      if (chatToArchive) {
        const userId = chatToArchive.chat_user_id;
        
        setActiveChats(prev => prev.filter(chat => chat.chat_user_id !== userId));
        setArchivedChats(prev => [
          ...prev,
          {
            ...chatToArchive,
            status: 'archived'
          }
        ]);
        
        if (selectedChat === userId) {
          setSelectedChat(null);
          toast.info(`El chat con Usuario ${userId} ha sido archivado`);
        }
      }
    }

    function onChatUnarchived(data: { conversationId: string; chat?: { userId: string; agentId: string; conversationId: string } }) {
      console.log('Chat desarchivado:', data);
      
      if (data.chat && data.chat.userId) {
        const userId = data.chat.userId;
        const agentId = data.chat.agentId || null;
        const conversationId = data.chat.conversationId;
        
        setArchivedChats(prev => prev.filter(chat => chat.chat_user_id !== userId));
        setActiveChats(prev => [
          ...prev,
          {
            chat_user_id: userId,
            chat_agent_id: agentId,
            conversationId: conversationId,
            status: 'active'
          }
        ]);
        
        if (selectedChat === userId) {
          setSelectedChat(null);
          toast.info(`El chat con Usuario ${userId} ha sido desarchivado`);
        }
        
        return;
      }
      
      const chatToUnarchive = archivedChats.find(chat => chat.conversationId === data.conversationId);
      
      if (chatToUnarchive) {
        const userId = chatToUnarchive.chat_user_id;
        
        setArchivedChats(prev => prev.filter(chat => chat.chat_user_id !== userId));
        setActiveChats(prev => [
          ...prev,
          {
            ...chatToUnarchive,
            status: 'active'
          }
        ]);
        
        if (selectedChat === userId) {
          setSelectedChat(null);
          toast.info(`El chat con Usuario ${userId} ha sido desarchivado`);
        }
      }
    }

    socket.on('activeChats', onActiveChats);
    socket.on('archivedChats', onArchivedChats);
    socket.on('agentAssigned', onAgentAssigned);
    socket.on('assignmentError', onAssignmentError);
    socket.on('connectionStatus', onConnectionStatus);
    socket.on('connectedUsers', onConnectedUsers);
    socket.on('chatArchived', onChatArchived);
    socket.on('chatUnarchived', onChatUnarchived);

    return () => {
      socket.off('activeChats', onActiveChats);
      socket.off('archivedChats', onArchivedChats);
      socket.off('agentAssigned', onAgentAssigned);
      socket.off('assignmentError', onAssignmentError);
      socket.off('connectionStatus', onConnectionStatus);
      socket.off('connectedUsers', onConnectedUsers);
      socket.off('chatArchived', onChatArchived);
      socket.off('chatUnarchived', onChatUnarchived);
    };
  }, [socket, agentId, assigningChat, selectedChat, activeChats, archivedChats]);

  useEffect(() => {
    if (currentConversationId && socket.connected) {
      socket.emit('selectConversation', {
        conversationId: currentConversationId,
        agentId
      });
    }
  }, [currentConversationId, agentId, socket]);

  const selectChat = useCallback((userId: string) => {
    setSelectedChat(userId);
    setCurrentConversationId(null);

    const activeChat = activeChats.find(chat => chat.chat_user_id === userId);
    const pendingChat = pendingChats.find(chat => chat.chat_user_id === userId);
    const archivedChat = archivedChats.find(chat => chat.chat_user_id === userId);

    const conversationId = activeChat?.conversationId || pendingChat?.conversationId || archivedChat?.conversationId;

    if (conversationId) {
      setCurrentConversationId(conversationId);

      socket.emit('selectConversation', {
        conversationId,
        agentId
      });
    } else {
      const isArchived = selectedTab === 'archived';
      
      socket.emit('getConversationId', { 
        userId, 
        isArchived 
      }, (response: { success: boolean; conversationId?: string; error?: string }) => {
        if (response && response.success && response.conversationId) {
          setCurrentConversationId(response.conversationId);

          if (isArchived) {
            setArchivedChats(prev => {
              const chatIndex = prev.findIndex(chat => chat.chat_user_id === userId);
              if (chatIndex >= 0) {
                const updatedChats = [...prev];
                updatedChats[chatIndex] = {
                  ...updatedChats[chatIndex],
                  conversationId: response.conversationId
                };
                return updatedChats;
              }
              return [
                ...prev,
                {
                  chat_user_id: userId,
                  chat_agent_id: null,
                  status: 'archived',
                  conversationId: response.conversationId
                }
              ];
            });
          } else {
            setActiveChats(prev => {
              const chatIndex = prev.findIndex(chat => chat.chat_user_id === userId);
              if (chatIndex >= 0) {
                const updatedChats = [...prev];
                updatedChats[chatIndex] = {
                  ...updatedChats[chatIndex],
                  conversationId: response.conversationId
                };
                return updatedChats;
              }
              return prev;
            });

            setPendingChats(prev => {
              const chatIndex = prev.findIndex(chat => chat.chat_user_id === userId);
              if (chatIndex >= 0) {
                const updatedChats = [...prev];
                updatedChats[chatIndex] = {
                  ...updatedChats[chatIndex],
                  conversationId: response.conversationId
                };
                return updatedChats;
              }
              return prev;
            });
          }

          socket.emit('selectConversation', {
            conversationId: response.conversationId,
            agentId
          });
        } else {
          const errorMessage = response?.error || 'No se encontró una conversación para este usuario';
          console.error('Error al obtener ID de conversación:', errorMessage);

          toast.error('No se puede cargar esta conversación', {
            description: errorMessage,
            duration: 5000
          });
        }
      });
    }
  }, [activeChats, pendingChats, archivedChats, agentId, socket, selectedTab]);

  const assignToMe = useCallback((userId: string, conversationId: string) => {
    const loadingToast = toast.loading('Asignando chat...');
    setAssigningChat(userId);

    socket.emit('assignAgent', {
      userId,
      agentId,
      conversationId,
      agentName: agentName || 'Agente'
    }, (response: { success: boolean; error?: string }) => {
      toast.dismiss(loadingToast);
      setAssigningChat(null);

      if (response && response.success) {
        setCurrentConversationId(conversationId);
        setPendingChats(prev => prev.filter(chat => chat.chat_user_id !== userId));

        setActiveChats(prev => {
          const existingChatIndex = prev.findIndex(chat => chat.chat_user_id === userId);

          if (existingChatIndex >= 0) {
            const updatedChats = [...prev];
            updatedChats[existingChatIndex] = {
              chat_user_id: userId,
              chat_agent_id: agentId,
              status: 'active',
              conversationId
            };
            return updatedChats;
          }

          return [
            ...prev,
            {
              chat_user_id: userId,
              chat_agent_id: agentId,
              status: 'active',
              conversationId
            }
          ];
        });

        setSelectedTab('active');
        selectChat(userId);

        toast.success(`Chat asignado correctamente a ${agentName || 'Agente'}`);
      } else {
        const errorMessage = response?.error || 'Error desconocido al asignar el chat';
        console.error('Error al asignar chat:', errorMessage);
        toast.error(`Error al asignar el chat: ${errorMessage}`);
      }
    });
  }, [agentId, selectChat, socket, agentName]);

  const archiveChat = useCallback((userId: string) => {
    const chatToArchive = activeChats.find(chat => chat.chat_user_id === userId);
    const conversationId = chatToArchive?.conversationId;

    if (!conversationId) {
      toast.error('No se puede archivar el chat: ID de conversación no encontrado');
      return;
    }

    const loadingToast = toast.loading('Archivando chat...');

    socket.emit('archiveChat', { 
      userId, 
      agentId, 
      conversationId 
    }, (response: { success: boolean; error?: string }) => {
      toast.dismiss(loadingToast);

      if (response && response.success) {
        if (selectedChat === userId) {
          setSelectedChat(null);
        }

        setSelectedTab('archived');

        toast.success(`Chat con Usuario ${userId} archivado correctamente`);
      } else {
        const errorMessage = response?.error || 'Error desconocido al archivar el chat';
        console.error('Error al archivar chat:', errorMessage);
        toast.error(`Error al archivar el chat: ${errorMessage}`);
      }
    });
  }, [agentId, selectedChat, socket, activeChats, setSelectedTab]);

  const unarchiveChat = useCallback((userId: string) => {
    const chatToUnarchive = archivedChats.find(chat => chat.chat_user_id === userId);
    const conversationId = chatToUnarchive?.conversationId;

    if (!conversationId) {
      toast.error('No se puede desarchivar el chat: ID de conversación no encontrado');
      return;
    }

    const loadingToast = toast.loading('Desarchivando chat...');

    socket.emit('unarchiveChat', { 
      userId, 
      agentId, 
      conversationId 
    }, (response: { success: boolean; error?: string }) => {
      toast.dismiss(loadingToast);

      if (response && response.success) {
        if (selectedChat === userId) {
          setSelectedChat(null);
        }

        setSelectedTab('active');

        toast.success(`Chat con Usuario ${userId} desarchivado correctamente`);
      } else {
        const errorMessage = response?.error || 'Error desconocido al desarchivar el chat';
        console.error('Error al desarchivar chat:', errorMessage);
        toast.error(`Error al desarchivar el chat: ${errorMessage}`);
      }
    });
  }, [agentId, selectedChat, socket, archivedChats, setSelectedTab]);

  const isUserConnected = useCallback((userId: string) => {
    return connectedUsers.has(userId);
  }, [connectedUsers]);

  return {
    activeChats,
    pendingChats,
    archivedChats,
    selectedChat,
    selectedTab,
    currentConversationId,
    assigningChat,
    users,
    setSelectedChat,
    setSelectedTab,
    selectChat,
    assignToMe,
    archiveChat,
    unarchiveChat,
    getUsernameById,
    connectedUsers,
    isUserConnected
  };
} 