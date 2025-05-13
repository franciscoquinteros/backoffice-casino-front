"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TransactionTable } from '@/components/transaction-table';
import { TransactionFilters } from '@/components/transaction-filters';
import { Transaction, TransactionFilter, transactionService } from '@/components/transaction-service';
import { TableSkeleton } from '@/components/ui/table-skeleton';

export default function DepositsDirectPage() {
    const { data: session, status: sessionStatus } = useSession();

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
    const [filters, setFilters] = useState<TransactionFilter>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTransactions = useCallback(async () => {
        if (!session?.user?.officeId || !session?.accessToken) return;

        try {
            setIsLoading(true);
            const officeTransactions = await transactionService.getTransactionsForOffice(
                session.user.officeId,
                session.accessToken
            );

            // Filtrar transacciones con descripciones específicas
            const directDeposits = officeTransactions.filter((tx: Transaction) =>
                tx.type === 'deposit' &&
                tx.status === 'Pending' &&
                (tx.description === 'Pago recibido vía IPN - Pendiente de validación' ||
                    tx.description === 'Bank Transfer')
            );

            setTransactions(directDeposits);
            setError(null);
        } catch (err) {
            console.error('Error fetching transactions:', err);
            setError('Error al cargar las transacciones. Por favor, intente nuevamente.');
        } finally {
            setIsLoading(false);
        }
    }, [session?.user?.officeId, session?.accessToken]);

    useEffect(() => {
        if (sessionStatus === "authenticated") {
            fetchTransactions();
        }
    }, [sessionStatus, fetchTransactions]);

    useEffect(() => {
        if (sessionStatus === "authenticated") {
            const interval = setInterval(fetchTransactions, 30000); // Actualizar cada 30 segundos
            return () => clearInterval(interval);
        }
    }, [sessionStatus, fetchTransactions]);

    useEffect(() => {
        if (transactions.length > 0) {
            const filtered = transactionService.applyFilters(transactions, filters);
            setFilteredTransactions(filtered);
        } else {
            setFilteredTransactions([]);
        }
    }, [filters, transactions]);

    const handleFilterChange = (newFilters: TransactionFilter) => {
        setFilters(newFilters);
    };

    const handleResetFilters = () => {
        setFilters({});
    };

    const handleTransactionApproved = async (transaction: Transaction) => {
        if (!session?.accessToken) return;

        try {
            const result = await transactionService.approveTransaction(transaction, session.accessToken);
            if (result.success) {
                await fetchTransactions(); // Recargar después de aprobar
            } else {
                setError(result.error || 'Error al aprobar la transacción');
            }
        } catch (err) {
            console.error('Error approving transaction:', err);
            setError('Error al aprobar la transacción. Por favor, intente nuevamente.');
        }
    };

    const handleTransactionRejected = async (transaction: Transaction) => {
        if (!session?.accessToken) return;

        try {
            await transactionService.rejectTransaction(transaction, session.accessToken);
            await fetchTransactions(); // Recargar después de rechazar
        } catch (err) {
            console.error('Error rejecting transaction:', err);
            setError('Error al rechazar la transacción. Por favor, intente nuevamente.');
        }
    };

    if (sessionStatus === "loading") {
        return (
            <div className="container mx-auto p-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-2xl font-bold">Depósitos Directos</CardTitle>
                        <CardDescription>Cargando...</CardDescription>
                    </CardHeader>
                    <div className="p-6 pt-3">
                        <TableSkeleton columns={[]} rowCount={5} />
                    </div>
                </Card>
            </div>
        );
    }

    if (sessionStatus === "unauthenticated") {
        return (
            <div className="container mx-auto p-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-2xl font-bold">Acceso Denegado</CardTitle>
                        <CardDescription>Por favor, inicie sesión para acceder a esta página.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4">
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-2xl font-bold">Depósitos Directos</CardTitle>
                    <CardDescription>
                        Gestione los depósitos directos que requieren aprobación (Oficina: {session?.user?.officeId || 'N/A'})
                    </CardDescription>
                </CardHeader>

                <div className="p-6 pt-3">
                    <TransactionFilters
                        onChange={handleFilterChange}
                        onReset={handleResetFilters}
                    />

                    {isLoading && transactions.length === 0 ? (
                        <TableSkeleton columns={[]} rowCount={5} />
                    ) : error ? (
                        <Card className="p-8 text-center">
                            <p className="text-red-500">{error}</p>
                        </Card>
                    ) : (
                        <TransactionTable
                            transactions={filteredTransactions}
                            showApproveButton={false}
                            onTransactionApproved={handleTransactionApproved}
                            onTransactionRejected={handleTransactionRejected}
                            isRefreshing={isLoading && transactions.length > 0}
                        />
                    )}
                </div>
            </Card>
        </div>
    );
} 