"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

// Tipos requeridos
export interface ChatMessage {
    id: string | number;
    userId: string;
    message: string;
    sender: string;
    agentId?: string;
    timestamp: Date | string;
    conversationId: string;
}

export interface Conversation {
    id: string;
    userId: string;
    agentId?: string;
    officeId?: string;
    title?: string;
    status: 'active' | 'closed';
    createdAt: Date | string;
    updatedAt: Date | string;
    messages?: ChatMessage[];
    initiatingUser?: {
        id: string | number;
        username: string;
        email: string;
    };
    assignedAgent?: {
        id: string | number;
        username: string;
        email: string;
    };
}

export interface ChatFilters {
    officeId?: string | null;
    status?: 'active' | 'closed' | null;
    search?: string | null;
    dateRange?: {
        from?: string | null;
        to?: string | null;
    };
}

export function useAllChats(filters: ChatFilters = {}) {
    const { data: session } = useSession();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Función para obtener todas las conversaciones de todas las oficinas
    const fetchAllConversations = useCallback(async () => {
        if (!session?.accessToken) {
            setError('No hay sesión activa');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            console.log('Fetching chats with token:', session.accessToken);
            // Usar el nuevo endpoint /chats/all para superadmin
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/chats/all`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            // Combinar conversaciones activas y cerradas
            const allConversations = [...(data.active || []), ...(data.closed || [])];
            setConversations(allConversations);
            setError(null);
        } catch (err) {
            console.error('Error al obtener conversaciones:', err);
            setError(err instanceof Error ? err.message : 'Error al cargar conversaciones');
            setConversations([]);
        } finally {
            setIsLoading(false);
        }
    }, [session?.accessToken]);

    // Efecto para cargar conversaciones al inicio
    useEffect(() => {
        if (session?.accessToken) {
            fetchAllConversations();
        }
    }, [session?.accessToken, fetchAllConversations]);

    // Función para aplicar filtros a las conversaciones
    const applyFilters = useCallback(() => {
        let result = [...conversations];

        // Filtrar por oficina
        if (filters.officeId) {
            result = result.filter(conv => conv.officeId === filters.officeId);
        }

        // Filtrar por estado (active, closed)
        if (filters.status) {
            result = result.filter(conv => conv.status === filters.status);
        }

        // Filtrar por rango de fechas
        if (filters.dateRange?.from) {
            const fromDate = new Date(filters.dateRange.from);
            result = result.filter(conv => new Date(conv.createdAt) >= fromDate);
        }

        if (filters.dateRange?.to) {
            const toDate = new Date(filters.dateRange.to);
            toDate.setHours(23, 59, 59, 999); // Final del día
            result = result.filter(conv => new Date(conv.createdAt) <= toDate);
        }

        // Búsqueda de texto (título, usuario, agente)
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            result = result.filter(conv =>
                (conv.title?.toLowerCase().includes(searchLower)) ||
                (conv.initiatingUser?.username?.toLowerCase().includes(searchLower)) ||
                (conv.initiatingUser?.email?.toLowerCase().includes(searchLower)) ||
                (conv.assignedAgent?.username?.toLowerCase().includes(searchLower)) ||
                (conv.assignedAgent?.email?.toLowerCase().includes(searchLower))
            );
        }

        setFilteredConversations(result);
    }, [conversations, filters]);

    // Efecto para aplicar filtros cuando cambian los filtros o las conversaciones
    useEffect(() => {
        applyFilters();
    }, [filters, conversations, applyFilters]);

    return {
        allConversations: conversations,
        filteredConversations,
        isLoading,
        error,
        refetch: fetchAllConversations
    };
} 