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
    wallet_address?: string;
    office?: string;
    accountName?: string;
    // Propiedades opcionales específicas
    date_created: string;
    account_name?: string;
    transaction_account_name?: string;
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

            // Debug: Ver los datos crudos que llegan de la API
            console.log('Datos crudos de la API:', data);
            if (data.length > 0) {
                console.log('[FRONTEND] Primera transacción:', {
                    id: data[0].id,
                    type: data[0].type,
                    payer_identification: data[0].payer_identification,
                    payer_identification_type: typeof data[0].payer_identification,
                    raw_stringified: JSON.stringify(data[0].payer_identification),
                    allKeys: Object.keys(data[0])
                });
            }

            // Asegurarnos de que todas las transacciones tengan date_created
            const processedData = data.map((transaction: Partial<Transaction> & {
                createdAt?: string;
                created_at?: string;
                updatedAt?: string;
                updated_at?: string;
                payer_identification?: PayerIdentification | string;
                transaction_account_name?: string;
            }) => {
                console.log('Procesando transacción:', {
                    id: transaction.id,
                    type: transaction.type,
                    payer_identification: transaction.payer_identification,
                    payer_identification_type: typeof transaction.payer_identification,
                    raw_stringified: JSON.stringify(transaction.payer_identification)
                });

                // Crear un nuevo objeto con la estructura correcta
                const processedTransaction: Transaction = {
                    id: transaction.id || '',
                    type: transaction.type || 'deposit',
                    amount: transaction.amount || 0,
                    status: transaction.status || 'Pending',
                    description: transaction.description || '',
                    date_created: transaction.date_created ||
                        transaction.dateCreated as string ||
                        transaction.createdAt ||
                        transaction.created_at ||
                        transaction.updatedAt ||
                        transaction.updated_at ||
                        new Date().toISOString(),
                    cbu: transaction.cbu,
                    payerEmail: transaction.payer_email,
                    wallet_address: transaction.wallet_address,
                    office: transaction.office,
                    account_name: transaction.account_name,
                    transaction_account_name: transaction.transaction_account_name,
                    external_reference: transaction.external_reference,
                    reference_transaction: transaction.reference_transaction,
                    payment_method_id: transaction.payment_method_id,
                    payer_id: transaction.payer_id,
                    payer_identification: transaction.payer_identification,
                    receiver_id: transaction.receiver_id,
                    account_holder: transaction.account_holder,
                    client_id: transaction.client_id,
                    idCliente: transaction.idCliente,
                    relatedUserTransactionId: transaction.relatedUserTransactionId,
                    assignedTo: transaction.assignedTo,
                    createdAt: transaction.createdAt,
                    updatedAt: transaction.updatedAt
                };

                console.log('Transacción procesada:', {
                    id: processedTransaction.id,
                    type: processedTransaction.type,
                    payer_identification: processedTransaction.payer_identification
                });

                return processedTransaction;
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
            // Crear fecha específicamente en GMT-3 (UTC-3)
            const [year, month, day] = filters.date.from.split('-').map(Number);
            const fromDate = new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0)); // 03:00 UTC = 00:00 GMT-3
            console.log(`🔍 [SuperDashboard DateFilter] Filtro desde: ${filters.date.from} -> ${fromDate.toISOString()} (GMT-3: ${fromDate.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })})`);
            result = result.filter(tx => {
                // Usar updatedAt si está disponible, sino usar dateCreated o date_created
                const txDate = tx.updatedAt ? new Date(tx.updatedAt) :
                    tx.dateCreated ? new Date(tx.dateCreated) :
                        new Date(tx.date_created);
                return txDate && txDate >= fromDate;
            });
        }

        if (filters.date?.to) {
            // Crear fecha específicamente en GMT-3 (UTC-3)
            const [year, month, day] = filters.date.to.split('-').map(Number);
            const toDate = new Date(Date.UTC(year, month - 1, day + 1, 2, 59, 59, 999)); // 02:59:59 UTC del día siguiente = 23:59:59 GMT-3
            console.log(`🔍 [SuperDashboard DateFilter] Filtro hasta: ${filters.date.to} -> ${toDate.toISOString()} (GMT-3: ${toDate.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })})`);
            result = result.filter(tx => {
                // Usar updatedAt si está disponible, sino usar dateCreated o date_created
                const txDate = tx.updatedAt ? new Date(tx.updatedAt) :
                    tx.dateCreated ? new Date(tx.dateCreated) :
                        new Date(tx.date_created);
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
                (tx.wallet_address?.toLowerCase().includes(searchLower)) ||
                (tx.accountName?.toLowerCase().includes(searchLower))
            );
        }

        setFilteredTransactions(result);
    }, [transactions, filters]);

    // Efecto para aplicar filtros cuando cambian los filtros o las transacciones
    useEffect(() => {
        applyFilters();
    }, [filters, transactions, applyFilters]);

    // Función para actualizar el estado de una transacción específica localmente
    const updateTransactionLocally = useCallback((transactionId: string, newStatus: string) => {
        setTransactions(prevTransactions =>
            prevTransactions.map(tx =>
                tx.id === transactionId ? { ...tx, status: newStatus } : tx
            )
        );
    }, []);

    return {
        allTransactions: transactions,
        filteredTransactions,
        isLoading: isLoading || isLoadingOffices,
        error,
        refetch: fetchAllTransactions,
        updateTransactionLocally
    };
} 