"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

// Tipos requeridos
export interface Withdraw {
    id: string;
    type: 'withdraw';
    amount: number;
    status: string;
    dateCreated?: Date | string | null;
    description: string;
    cbu?: string;
    walletAddress?: string;
    office?: string;
    accountName?: string;
    // Propiedades opcionales específicas
    date_created?: string;
    account_name?: string;
    external_reference?: string;
    reference_transaction?: string;
    payment_method_id?: string;
    payer_id?: string;
    payer_email?: string;
    payer_identification?: string;
    receiver_id?: string;
    account_holder?: string;
    client_id?: string;
    idCliente?: string | number;
    relatedUserTransactionId?: string;
    assignedTo?: string;
    createdAt?: string;
    updatedAt?: string;
    wallet_address?: string;
}

export interface WithdrawFilters {
    officeId?: string | null;
    status?: string | null;
    date?: {
        from?: string | null;
        to?: string | null;
    };
    search?: string | null;
}

export function useAllWithdraws(filters: WithdrawFilters = {}) {
    const { data: session } = useSession();
    const [withdraws, setWithdraws] = useState<Withdraw[]>([]);
    const [filteredWithdraws, setFilteredWithdraws] = useState<Withdraw[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Función para obtener todos los retiros de todas las oficinas
    const fetchAllWithdraws = useCallback(async () => {
        if (!session?.accessToken) {
            setError('No hay sesión activa');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            console.log('Fetching withdraws with token:', session.accessToken);
            // Obtenemos todas las transacciones y filtramos por tipo = withdraw
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
            // Filtramos solo los retiros
            const withdrawsOnly = data.filter((tx: { type: string }) => tx.type === 'withdraw');
            setWithdraws(withdrawsOnly);
            setError(null);
        } catch (err: unknown) {
            console.error('Error al obtener retiros:', err);
            setError(err instanceof Error ? err.message : 'Error al cargar retiros');
            setWithdraws([]);
        } finally {
            setIsLoading(false);
        }
    }, [session?.accessToken]);

    // Efecto para cargar retiros al inicio
    useEffect(() => {
        if (session?.accessToken) {
            fetchAllWithdraws();
        }
    }, [session?.accessToken, fetchAllWithdraws]);

    // Función para aplicar filtros a los retiros
    const applyFilters = useCallback(() => {
        let result = [...withdraws];

        // Filtrar por oficina
        if (filters.officeId) {
            result = result.filter((withdraw: Withdraw) => withdraw.office === filters.officeId);
        }

        // Filtrar por estado
        if (filters.status) {
            result = result.filter((withdraw: Withdraw) => withdraw.status === filters.status);
        }

        // Filtrar por fechas
        if (filters.date?.from) {
            const fromDate = new Date(filters.date.from);
            result = result.filter((withdraw: Withdraw) => {
                const withdrawDate = withdraw.dateCreated ? new Date(withdraw.dateCreated) : null;
                return withdrawDate && withdrawDate >= fromDate;
            });
        }

        if (filters.date?.to) {
            const toDate = new Date(filters.date.to);
            toDate.setHours(23, 59, 59, 999); // Final del día
            result = result.filter((withdraw: Withdraw) => {
                const withdrawDate = withdraw.dateCreated ? new Date(withdraw.dateCreated) : null;
                return withdrawDate && withdrawDate <= toDate;
            });
        }

        // Búsqueda de texto
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            result = result.filter((withdraw: Withdraw) =>
                (withdraw.id?.toString().toLowerCase().includes(searchLower)) ||
                (withdraw.walletAddress?.toLowerCase().includes(searchLower)) ||
                (withdraw.description?.toLowerCase().includes(searchLower)) ||
                (withdraw.cbu?.toLowerCase().includes(searchLower)) ||
                (withdraw.accountName?.toLowerCase().includes(searchLower))
            );
        }

        setFilteredWithdraws(result);
    }, [withdraws, filters]);

    // Efecto para aplicar filtros cuando cambian los filtros o los retiros
    useEffect(() => {
        applyFilters();
    }, [filters, withdraws, applyFilters]);

    return {
        allWithdraws: withdraws,
        filteredWithdraws,
        isLoading,
        error,
        refetch: fetchAllWithdraws
    };
} 