"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

// Tipos requeridos
export interface Deposit {
    id: string;
    type: 'deposit';
    amount: number;
    status: string;
    dateCreated?: Date | string | null;
    description: string;
    cbu?: string;
    payerEmail?: string;
    office?: string;
    accountName?: string;
    [key: string]: any; // Para otros campos
}

export interface DepositFilters {
    officeId?: string | null;
    status?: string | null;
    date?: {
        from?: string | null;
        to?: string | null;
    };
    search?: string | null;
}

export function useAllDeposits(filters: DepositFilters = {}) {
    const { data: session } = useSession();
    const [deposits, setDeposits] = useState<Deposit[]>([]);
    const [filteredDeposits, setFilteredDeposits] = useState<Deposit[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Función para obtener todos los depósitos de todas las oficinas
    const fetchAllDeposits = useCallback(async () => {
        if (!session?.accessToken) {
            setError('No hay sesión activa');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            console.log('Fetching deposits with token:', session.accessToken);
            // Obtenemos todas las transacciones y filtramos por tipo = deposit
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/transactions/all`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            // Filtramos solo los depósitos
            const depositsOnly = data.filter(tx => tx.type === 'deposit');
            setDeposits(depositsOnly);
            setError(null);
        } catch (err) {
            console.error('Error al obtener depósitos:', err);
            setError(err instanceof Error ? err.message : 'Error al cargar depósitos');
            setDeposits([]);
        } finally {
            setIsLoading(false);
        }
    }, [session?.accessToken]);

    // Efecto para cargar depósitos al inicio
    useEffect(() => {
        if (session?.accessToken) {
            fetchAllDeposits();
        }
    }, [session?.accessToken, fetchAllDeposits]);

    // Función para aplicar filtros a los depósitos
    const applyFilters = useCallback(() => {
        let result = [...deposits];

        // Filtrar por oficina
        if (filters.officeId) {
            result = result.filter(dep => dep.office === filters.officeId);
        }

        // Filtrar por estado
        if (filters.status) {
            result = result.filter(dep => dep.status === filters.status);
        }

        // Filtrar por fechas
        if (filters.date?.from) {
            const fromDate = new Date(filters.date.from);
            result = result.filter(dep => {
                const depDate = dep.dateCreated ? new Date(dep.dateCreated) : null;
                return depDate && depDate >= fromDate;
            });
        }

        if (filters.date?.to) {
            const toDate = new Date(filters.date.to);
            toDate.setHours(23, 59, 59, 999); // Final del día
            result = result.filter(dep => {
                const depDate = dep.dateCreated ? new Date(dep.dateCreated) : null;
                return depDate && depDate <= toDate;
            });
        }

        // Búsqueda de texto
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            result = result.filter(dep =>
                (dep.id?.toString().toLowerCase().includes(searchLower)) ||
                (dep.payerEmail?.toLowerCase().includes(searchLower)) ||
                (dep.description?.toLowerCase().includes(searchLower)) ||
                (dep.cbu?.toLowerCase().includes(searchLower)) ||
                (dep.accountName?.toLowerCase().includes(searchLower))
            );
        }

        setFilteredDeposits(result);
    }, [deposits, filters]);

    // Efecto para aplicar filtros cuando cambian los filtros o los depósitos
    useEffect(() => {
        applyFilters();
    }, [filters, deposits, applyFilters]);

    return {
        allDeposits: deposits,
        filteredDeposits,
        isLoading,
        error,
        refetch: fetchAllDeposits
    };
} 