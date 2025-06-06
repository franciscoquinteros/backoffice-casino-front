"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';

// Tipos requeridos
export interface Account {
    id: string | number;
    office: string;
    wallet: string;
    name: string;
    alias: string;
    cbu: string;
    operator: string;
    agent: string;
    status: string;
    createdAt?: Date | string;
    accumulatedAmount?: number;
    accountName?: string;
    mp_access_token?: string;
    mp_client_id?: string;
    mp_client_secret?: string;
    mp_public_key?: string;
    receiver_id?: string;
    account_holder?: string;
    updatedAt?: Date | string;
}

export interface AccountFilters {
    officeId?: string | null;
    status?: string | null;
    search?: string | null;
}

export function useAllAccounts(filters: AccountFilters = {}) {
    const { data: session } = useSession();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Función para obtener todas las cuentas de todas las oficinas
    const fetchAllAccounts = useCallback(async () => {
        if (!session?.accessToken) {
            setError('No hay sesión activa');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            console.log('Fetching accounts with token:', session.accessToken);
            // Endpoint para superadmin que devuelve cuentas de todas las oficinas
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/accounts/all`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            setAccounts(data.accounts || data); // Manejar ambos formatos de respuesta
            setError(null);
        } catch (err) {
            console.error('Error al obtener cuentas:', err);
            setError(err instanceof Error ? err.message : 'Error al cargar cuentas');
            setAccounts([]);
        } finally {
            setIsLoading(false);
        }
    }, [session?.accessToken]);

    // Efecto para cargar cuentas al inicio
    useEffect(() => {
        if (session?.accessToken) {
            fetchAllAccounts();
        }
    }, [session?.accessToken, fetchAllAccounts]);

    // Usar useMemo para filtrar las cuentas
    const filteredAccounts = useMemo(() => {
        let result = [...accounts];

        // Filtrar por oficina
        if (filters.officeId) {
            result = result.filter(account => account.office === filters.officeId);
        }

        // Filtrar por estado
        if (filters.status) {
            result = result.filter(account => account.status === filters.status);
        }

        // Búsqueda de texto
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            result = result.filter(account =>
                (account.id?.toString().toLowerCase().includes(searchLower)) ||
                (account.name?.toLowerCase().includes(searchLower)) ||
                (account.alias?.toLowerCase().includes(searchLower)) ||
                (account.cbu?.toLowerCase().includes(searchLower)) ||
                (account.operator?.toLowerCase().includes(searchLower))
            );
        }

        return result;
    }, [accounts, filters.officeId, filters.status, filters.search]);

    return {
        allAccounts: accounts,
        filteredAccounts,
        isLoading,
        error,
        refetch: fetchAllAccounts
    };
} 