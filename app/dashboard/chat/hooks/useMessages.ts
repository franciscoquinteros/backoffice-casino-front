import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { nanoid } from 'nanoid';
import { Message, MessageEndRef } from '../types';

interface UseMessagesProps {
  socket: Socket;
  selectedChat: string | null;
  currentConversationId: string | null;
  agentId: string;
}

interface UseMessagesReturn {
  messages: Message[];
  sendMessage: (message: string) => void;
  messagesEndRef: MessageEndRef;
  scrollToBottom: () => void;
  isLoadingMessages: boolean;
}

export function useMessages({
  socket,
  selectedChat,
  currentConversationId,
  agentId
}: UseMessagesProps): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Tracking recently sent messages to prevent duplicates
  const sentMessagesRef = useRef<Set<string>>(new Set());
  // Track the currently loading conversation to prevent race conditions
  const loadingConversationRef = useRef<string | null>(null);
  // Timeout for loading messages
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = useCallback(() => {
    // ONLY use this for manual scroll requests
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'instant', block: 'end' });
    }
  }, []);

  useEffect(() => {
    // Clear messages and start loading when changing chats
    if (selectedChat && currentConversationId) {
      console.log(`🔄 Cambiando a chat ${selectedChat}, conversación ${currentConversationId}`);
      setMessages([]);
      setIsLoadingMessages(true);
      loadingConversationRef.current = currentConversationId;
      // Clear sent messages tracking when changing chats
      sentMessagesRef.current.clear();

      // Clear any existing timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }

      // Set a timeout to stop loading if no response in 10 seconds
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn(`⏰ Timeout al cargar mensajes para conversación ${currentConversationId}`);
        setIsLoadingMessages(false);
        loadingConversationRef.current = null;
      }, 10000);
    } else if (!selectedChat) {
      // If no chat is selected, clear everything
      setMessages([]);
      setIsLoadingMessages(false);
      loadingConversationRef.current = null;
      sentMessagesRef.current.clear();
    } else if (selectedChat && !currentConversationId) {
      // If chat is selected but no conversation ID yet, show loading
      setMessages([]);
      setIsLoadingMessages(true);
      loadingConversationRef.current = null;
      sentMessagesRef.current.clear();
    }
  }, [selectedChat, currentConversationId]);

  useEffect(() => {
    function onMessageHistory(chatMessages: Message[]) {
      console.log(`📥 Recibiendo historial de mensajes:`, chatMessages?.length || 0);

      if (Array.isArray(chatMessages)) {
        const messagesWithIds = chatMessages.map(msg => ({
          ...msg,
          id: msg.id || nanoid()
        }));
        setMessages(messagesWithIds);
      } else {
        setMessages([]);
      }

      // Finalizar loading
      setIsLoadingMessages(false);
      loadingConversationRef.current = null;

      // Clear timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    }

    function onConversationMessages(data: { conversationId: string; messages: Message[] }) {
      // Verificar que estos mensajes corresponden a la conversación que estamos cargando
      if (loadingConversationRef.current && loadingConversationRef.current !== data.conversationId) {
        return;
      }

      if (Array.isArray(data.messages)) {
        const messagesWithIds = data.messages.map(msg => ({
          ...msg,
          id: msg.id || nanoid()
        }));
        setMessages(messagesWithIds);
      } else {
        setMessages([]);
      }

      // Finalizar loading solo si es la conversación correcta
      if (data.conversationId === loadingConversationRef.current) {
        setIsLoadingMessages(false);
        loadingConversationRef.current = null;

        // Clear timeout
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
      }
    }

    function onNewMessage(message: Message) {
      const isForCurrentChat = selectedChat === message.userId ||
        (message.conversationId && message.conversationId === currentConversationId);

      if (isForCurrentChat) {
        setMessages(prevMessages => {
          // Create a more robust message fingerprint
          const messageFingerprint = `${message.sender}-${message.message}-${message.userId}-${new Date(message.timestamp).getTime()}`;

          // Check if this message was recently sent by this client
          if (sentMessagesRef.current.has(messageFingerprint)) {
            // Message was sent by this client, don't add it again
            return prevMessages;
          }

          // Check for duplicate messages with more robust criteria
          const messageExists = prevMessages.some(msg => {
            // Check exact ID match
            if (msg.id === message.id && message.id) {
              return true;
            }

            // Check content + metadata similarity with larger time window
            if (msg.message === message.message &&
              msg.sender === message.sender &&
              msg.userId === message.userId &&
              Math.abs(new Date(msg.timestamp).getTime() - new Date(message.timestamp).getTime()) < 5000) {
              return true;
            }

            return false;
          });

          if (messageExists) {
            return prevMessages;
          }

          const newMessage = {
            ...message,
            id: message.id || nanoid()
          };

          return [...prevMessages, newMessage];
        });

        // NO AUTO-SCROLL for ANY incoming messages
        // Let user control their scroll position
      }
    }

    // Register event listeners
    if (socket) {
      socket.on('messageHistory', onMessageHistory);
      socket.on('conversationMessages', onConversationMessages);
      socket.on('newMessage', onNewMessage);

      return () => {
        socket.off('messageHistory', onMessageHistory);
        socket.off('conversationMessages', onConversationMessages);
        socket.off('newMessage', onNewMessage);

        // Clear timeout on cleanup
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
      };
    }
  }, [socket, selectedChat, currentConversationId, agentId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, []);

  const sendMessage = useCallback((message: string) => {
    if (!selectedChat || !currentConversationId || !message.trim()) {
      return;
    }

    const trimmedMessage = message.trim();

    // Create temporary message for optimistic UI update
    const tempMessage: Message = {
      id: nanoid(),
      userId: selectedChat,
      message: trimmedMessage,
      sender: 'agent',
      agentId,
      timestamp: new Date().toISOString(),
      conversationId: currentConversationId
    };

    // Add message fingerprint to sent messages tracker
    const messageFingerprint = `agent-${trimmedMessage}-${selectedChat}-${new Date(tempMessage.timestamp).getTime()}`;
    sentMessagesRef.current.add(messageFingerprint);

    // Clean up old message fingerprints after 10 seconds to prevent memory leaks
    setTimeout(() => {
      sentMessagesRef.current.delete(messageFingerprint);
    }, 10000);

    setMessages(prev => [...prev, tempMessage]);

    socket.emit('message', {
      userId: selectedChat,
      message: trimmedMessage,
      agentId,
      conversationId: currentConversationId
    }, (response: { success: boolean; message?: string }) => {
      if (!response.success) {
        console.error(`Error al enviar mensaje: ${response.message || 'Error desconocido'}`);
      }
    });

    // NO AUTO-SCROLL even when sending messages
    // User can manually scroll if they want
  }, [selectedChat, currentConversationId, agentId, socket]);

  return {
    messages,
    sendMessage,
    messagesEndRef,
    scrollToBottom,
    isLoadingMessages
  };
} 