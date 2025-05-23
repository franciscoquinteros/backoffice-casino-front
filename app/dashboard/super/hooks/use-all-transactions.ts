"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { PayerIdentification } from '@/components/transaction-service';
import { useOffices } from '@/components/hooks/use-offices';

// Tipos requeridos
export interface Transaction {
    id: string;
    type: 'deposit' | 'withdraw';
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
    payer_identification?: PayerIdentification | string;
    receiver_id?: string;
    account_holder?: string;
    client_id?: string;
    idCliente?: string | number;
    relatedUserTransactionId?: string;
    assignedTo?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface TransactionFilters {
    officeId?: string | null;
    type?: 'deposit' | 'withdraw' | null;
    status?: string | null;
    date?: {
        from?: string | null;
        to?: string | null;
    };
    search?: string | null;
}

export function useAllTransactions(filters: TransactionFilters = {}) {
    const { data: session } = useSession();
    const { offices, isLoading: isLoadingOffices } = useOffices();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Función para obtener todas las transacciones de todas las oficinas
    const fetchAllTransactions = useCallback(async () => {
        if (!session?.accessToken) {
            setError('No hay sesión activa');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            console.log('Fetching transactions with token:', session.accessToken);
            // Endpoint para superadmin que devuelve transacciones de todas las oficinas
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

            // Asegurarnos de que todas las transacciones tengan date_created
            const processedData = data.map((transaction: Partial<Transaction> & {
                createdAt?: string;
                created_at?: string;
                updatedAt?: string;
                updated_at?: string;
                payer_identification?: PayerIdentification | string;
            }) => {
                if (!transaction.date_created) {
                    // Si no existe date_created, establecerlo en base a otras propiedades disponibles
                    transaction.date_created =
                        transaction.dateCreated as string ||
                        transaction.createdAt ||
                        transaction.created_at ||
                        transaction.updatedAt ||
                        transaction.updated_at ||
                        new Date().toISOString();
                }

                // Procesar payer_identification si existe y es una cadena
                if (transaction.payer_identification && typeof transaction.payer_identification === 'string') {
                    transaction.payer_identification = {
                        type: 'DNI',
                        number: transaction.payer_identification
                    };
                }

                return transaction as Transaction;
            });

            // Obtener lista de IDs de oficinas válidas (registradas)
            const validOfficeIds = new Set(offices.map(office => office.id.toString()));

            // Filtrar las transacciones para excluir:
            // 1. Las que tengan estado "Match" 
            // 2. Las que no pertenezcan a oficinas registradas
            const filteredData = processedData.filter((transaction: Transaction) => {
                // Excluir transacciones con estado "Match"
                if (transaction.status === 'Match') return false;

                // Solo incluir transacciones de oficinas válidas/registradas
                // Si no tiene oficina asignada o la oficina no existe, excluir
                if (!transaction.office) return false;

                return validOfficeIds.has(transaction.office.toString());
            });

            console.log(`Transacciones filtradas: ${processedData.length} -> ${filteredData.length} (solo oficinas registradas)`);
            setTransactions(filteredData);
            setError(null);
        } catch (err) {
            console.error('Error al obtener transacciones:', err);
            setError(err instanceof Error ? err.message : 'Error al cargar transacciones');
            setTransactions([]);
        } finally {
            setIsLoading(false);
        }
    }, [session?.accessToken, offices]);

    // Efecto para cargar transacciones al inicio y cuando cambien las oficinas
    useEffect(() => {
        if (session?.accessToken && !isLoadingOffices) {
            fetchAllTransactions();
        }
    }, [session?.accessToken, fetchAllTransactions, isLoadingOffices]);

    // Función para aplicar filtros a las transacciones
    const applyFilters = useCallback(() => {
        let result = [...transactions];

        // Filtrar por oficina
        if (filters.officeId) {
            result = result.filter(tx => tx.office === filters.officeId);
        }

        // Filtrar por tipo (deposit/withdraw)
        if (filters.type) {
            result = result.filter(tx => tx.type === filters.type);
        }

        // Filtrar por estado (Pending, Accepted, Rejected, etc)
        if (filters.status) {
            result = result.filter(tx => tx.status === filters.status);
        }

        // Filtrar por fechas
        if (filters.date?.from) {
            const fromDate = new Date(filters.date.from);
            result = result.filter(tx => {
                const txDate = tx.dateCreated ? new Date(tx.dateCreated) : null;
                return txDate && txDate >= fromDate;
            });
        }

        if (filters.date?.to) {
            const toDate = new Date(filters.date.to);
            toDate.setHours(23, 59, 59, 999); // Final del día
            result = result.filter(tx => {
                const txDate = tx.dateCreated ? new Date(tx.dateCreated) : null;
                return txDate && txDate <= toDate;
            });
        }

        // Búsqueda de texto
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            result = result.filter(tx =>
                (tx.id?.toString().toLowerCase().includes(searchLower)) ||
                (tx.payerEmail?.toLowerCase().includes(searchLower)) ||
                (tx.description?.toLowerCase().includes(searchLower)) ||
                (tx.cbu?.toLowerCase().includes(searchLower)) ||
                (tx.walletAddress?.toLowerCase().includes(searchLower)) ||
                (tx.accountName?.toLowerCase().includes(searchLower))
            );
        }

        setFilteredTransactions(result);
    }, [transactions, filters]);

    // Efecto para aplicar filtros cuando cambian los filtros o las transacciones
    useEffect(() => {
        applyFilters();
    }, [filters, transactions, applyFilters]);

    return {
        allTransactions: transactions,
        filteredTransactions,
        isLoading: isLoading || isLoadingOffices,
        error,
        refetch: fetchAllTransactions
    };
} 