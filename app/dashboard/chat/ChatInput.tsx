'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { Socket } from 'socket.io-client';

interface ChatInputProps {
    chatId: string | null;
    socket: Socket;
    conversationId?: string;
    onSendMessage: (message: string) => void;
}

export default function ChatInput({
    chatId,
    socket,
    conversationId,
    onSendMessage
}: ChatInputProps) {
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const adjustHeight = () => {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
        };

        textarea.addEventListener('input', adjustHeight);
        return () => textarea.removeEventListener('input', adjustHeight);
    }, []);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isSending || !conversationId) return;

        const messageText = input.trim();
        setIsSending(true);

        try {
            if (!socket || !socket.connected) {
                throw new Error('No hay conexión con el servidor');
            }

            onSendMessage(messageText);

            setInput('');
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        } catch (error) {
            console.error('Error al enviar mensaje:', error);
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e as unknown as React.FormEvent);
        }
    };

    return (
        <div className="border-t bg-background p-4 rounded-b-xl">
            <div className="flex items-end gap-2">
                <div className="relative flex-1">
                    <Textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Escribe un mensaje..."
                        className="resize-none pr-10 min-h-[52px] max-h-[200px] overflow-y-auto"
                        disabled={isSending || !chatId || !conversationId}
                        rows={1}
                    />
                </div>
                <Button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isSending || !chatId || !conversationId}
                    size="icon"
                    className="h-10 w-10"
                >
                    {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Send className="h-4 w-4" />
                    )}
                    <span className="sr-only">Enviar mensaje</span>
                </Button>
            </div>
            {!conversationId && chatId && (
                <p className="text-xs text-red-500 mt-2">
                    No se puede enviar mensajes sin ID de conversación
                </p>
            )}
        </div>
    );
}