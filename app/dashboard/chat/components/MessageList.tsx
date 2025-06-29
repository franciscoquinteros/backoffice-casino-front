'use client';

import React from 'react';
import { MessageItem } from './MessageItem';
import { Message, MessageEndRef } from '../types';

interface MessageListProps {
  messages: Message[];
  messagesEndRef: MessageEndRef;
}

export function MessageList({ messages, messagesEndRef }: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="space-y-4">
        {messages.length > 0 ? (
          messages.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No hay mensajes aún
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
} 