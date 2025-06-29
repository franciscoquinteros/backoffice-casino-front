'use client';

import React from 'react';
import { Message, MessageEndRef } from '../types';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: Message[];
  messagesEndRef: MessageEndRef;
}

export function MessageList({ messages, messagesEndRef }: MessageListProps) {
  return (
    <div
      className="flex-1 p-4 overflow-y-auto"
      style={{
        scrollBehavior: 'auto', // Never use smooth scrolling
        overscrollBehavior: 'contain', // Prevent scroll chaining
        WebkitOverflowScrolling: 'touch', // Better touch scrolling on mobile
        scrollbarWidth: 'thin', // Thinner scrollbar
        minHeight: 0, // Allow flex shrinking
        position: 'relative' // Establish positioning context
      }}
    >
      {messages.length === 0 ? (
        <div className="text-center text-gray-500 mt-8">
          No hay mensajes en esta conversación
        </div>
      ) : (
        <div className="space-y-2 min-h-full">
          {messages.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))}
          {/* Invisible target for manual scroll - keep it minimal and stable */}
          <div
            ref={messagesEndRef}
            style={{
              height: '1px',
              width: '100%',
              flexShrink: 0
            }}
          />
        </div>
      )}
    </div>
  );
} 