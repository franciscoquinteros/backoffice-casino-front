"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useOffices } from '@/components/hooks/use-offices';

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
    walletAddress?: string;
    office?: string;
    accountName?: string;
    // Propiedades opcionales específicas
    date_created: string;
    account_name?: string;
    external_reference?: string;
    reference_transaction?: string;
    payment_method_id?: string;
    payer_id?: string;
    payer_email?: string;
    receiver_id?: string;
    account_holder?: string;
    client_id?: string;
    idCliente?: string | number;
    relatedUserTransactionId?: string;
    assignedTo?: string;
    createdAt?: string;
    updatedAt?: string;
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
    const { offices, isLoading: isLoadingOffices } = useOffices();
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

            // Obtener lista de IDs de oficinas válidas (registradas)
            const validOfficeIds = new Set(offices.map(office => office.id.toString()));

            // Filtramos solo los depósitos de oficinas registradas
            const depositsOnly = data.filter((tx: { type: string; office?: string }) => {
                // Solo depósitos
                if (tx.type !== 'deposit') return false;

                // Solo de oficinas válidas/registradas
                if (!tx.office) return false;

                return validOfficeIds.has(tx.office.toString());
            });

            console.log(`Depósitos filtrados: ${data.length} -> ${depositsOnly.length} (solo oficinas registradas)`);
            setDeposits(depositsOnly);
            setError(null);
        } catch (err: unknown) {
            console.error('Error al obtener depósitos:', err);
            setError(err instanceof Error ? err.message : 'Error al cargar depósitos');
            setDeposits([]);
        } finally {
            setIsLoading(false);
        }
    }, [session?.accessToken, offices]);

    // Efecto para cargar depósitos al inicio y cuando cambien las oficinas
    useEffect(() => {
        if (session?.accessToken && !isLoadingOffices) {
            fetchAllDeposits();
        }
    }, [session?.accessToken, fetchAllDeposits, isLoadingOffices]);

    // Función para aplicar filtros a los depósitos
    const applyFilters = useCallback(() => {
        let result = [...deposits];

        // Filtrar por oficina
        if (filters.officeId) {
            result = result.filter(deposit => deposit.office === filters.officeId);
        }

        // Filtrar por estado (Pending, Accepted, Rejected, etc)
        if (filters.status) {
            result = result.filter(deposit => deposit.status === filters.status);
        }

        // Filtrar por fechas
        if (filters.date?.from) {
            const fromDate = new Date(filters.date.from);
            result = result.filter(deposit => {
                const depositDate = deposit.dateCreated ? new Date(deposit.dateCreated) : null;
                return depositDate && depositDate >= fromDate;
            });
        }

        if (filters.date?.to) {
            const toDate = new Date(filters.date.to);
            toDate.setHours(23, 59, 59, 999); // Final del día
            result = result.filter(deposit => {
                const depositDate = deposit.dateCreated ? new Date(deposit.dateCreated) : null;
                return depositDate && depositDate <= toDate;
            });
        }

        // Búsqueda de texto
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            result = result.filter(deposit =>
                (deposit.id?.toString().toLowerCase().includes(searchLower)) ||
                (deposit.payerEmail?.toLowerCase().includes(searchLower)) ||
                (deposit.description?.toLowerCase().includes(searchLower)) ||
                (deposit.cbu?.toLowerCase().includes(searchLower)) ||
                (deposit.walletAddress?.toLowerCase().includes(searchLower)) ||
                (deposit.accountName?.toLowerCase().includes(searchLower))
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
        isLoading: isLoading || isLoadingOffices,
        error,
        refetch: fetchAllDeposits
    };
} 