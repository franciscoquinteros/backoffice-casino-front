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
}

export function useMessages({
  socket,
  selectedChat,
  currentConversationId,
  agentId
}: UseMessagesProps): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Tracking recently sent messages to prevent duplicates
  const sentMessagesRef = useRef<Set<string>>(new Set());
  // Track if user is near bottom to decide whether to auto-scroll
  const isNearBottomRef = useRef(true);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Function to check if user is near the bottom of the chat
  const checkIfNearBottom = useCallback(() => {
    if (!messagesEndRef.current) return true;

    // Find the scroll container (div with overflow-y-auto)
    const container = messagesEndRef.current.closest('.overflow-y-auto');
    if (!container) return true;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100; // 100px threshold
    isNearBottomRef.current = isNearBottom;
    return isNearBottom;
  }, []);

  // Only auto-scroll if user is near bottom
  const conditionalScrollToBottom = useCallback(() => {
    if (isNearBottomRef.current) {
      scrollToBottom();
    }
  }, [scrollToBottom]);

  // Set up scroll listener
  useEffect(() => {
    if (!messagesEndRef.current) return;

    const container = messagesEndRef.current.closest('.overflow-y-auto');
    if (!container) return;

    // Add scroll listener to track user's scroll position
    const handleScroll = () => {
      checkIfNearBottom();
    };

    container.addEventListener('scroll', handleScroll);

    // Initial check
    checkIfNearBottom();

    return () => container.removeEventListener('scroll', handleScroll);
  }, [checkIfNearBottom, selectedChat]);

  useEffect(() => {
    // Clear messages when changing chats
    if (selectedChat) {
      setMessages([]);
      // Clear sent messages tracking when changing chats
      sentMessagesRef.current.clear();
      // Reset scroll tracking for new chat
      isNearBottomRef.current = true;
    }
  }, [selectedChat]);

  // Removed the showToastNotification function since notifications are now handled globally

  useEffect(() => {
    function onMessageHistory(chatMessages: Message[]) {
      if (Array.isArray(chatMessages)) {
        const messagesWithIds = chatMessages.map(msg => ({
          ...msg,
          id: msg.id || nanoid()
        }));
        setMessages(messagesWithIds);
        // Always scroll to bottom when loading message history
        setTimeout(() => {
          scrollToBottom();
          isNearBottomRef.current = true;
        }, 100);
      } else {
        setMessages([]);
      }
    }

    function onConversationMessages(data: { conversationId: string; messages: Message[] }) {
      if (Array.isArray(data.messages)) {
        const messagesWithIds = data.messages.map(msg => ({
          ...msg,
          id: msg.id || nanoid()
        }));
        setMessages(messagesWithIds);
        // Always scroll to bottom when loading conversation messages
        setTimeout(() => {
          scrollToBottom();
          isNearBottomRef.current = true;
        }, 100);
      } else {
        setMessages([]);
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

        // Only auto-scroll if user is near bottom or if it's from current agent
        setTimeout(() => {
          checkIfNearBottom();
          if (message.agentId === agentId || isNearBottomRef.current) {
            conditionalScrollToBottom();
          }
        }, 50);
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
      };
    }
  }, [socket, selectedChat, currentConversationId, scrollToBottom, conditionalScrollToBottom, agentId, checkIfNearBottom]);


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

    // Always scroll to bottom when sending a message
    setTimeout(() => {
      scrollToBottom();
      isNearBottomRef.current = true;
    }, 50);
  }, [selectedChat, currentConversationId, agentId, scrollToBottom, socket]);

  return {
    messages,
    sendMessage,
    messagesEndRef,
    scrollToBottom
  };
} 