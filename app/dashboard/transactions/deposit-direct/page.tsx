"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { TransactionTable } from '@/components/transaction-table';
import { Transaction, TransactionFilter as TransactionFilterType, transactionService } from '@/components/transaction-service';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { TransactionFilters } from '@/components/transaction-filters';

export default function DepositsDirectPage() {
    const { data: session, status: sessionStatus } = useSession();

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
    const [filters, setFilters] = useState<TransactionFilterType>({});
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
            // Excluir 'Bank Transfer' ya que ahora aparecen en la página de "Depósitos Completados"
            const directDeposits = officeTransactions.filter((tx: Transaction) =>
                tx.type === 'deposit' &&
                tx.status === 'Pending' &&
                (tx.description === 'Pago recibido vía IPN - Pendiente de validación' ||
                    tx.description === 'Bank Transfer')
            );

            // Pre-procesar todas las transacciones para asegurar que tengan account_name
            const processedDeposits = directDeposits.map(tx => {
                // Para Bank Transfer, usar el account_name recibido directamente del backend
                if (tx.description === 'Bank Transfer') {
                    // Usar el account_name directamente del backend
                    // El componente TransactionTable se encargará de buscar valores actualizados si es necesario
                    const txWithFields = tx as Transaction & { accountName?: string };
                    return {
                        ...tx,
                        // Solo asignar un valor por defecto si realmente no tiene valor
                        account_name: tx.account_name || txWithFields.accountName || tx.account_holder || 'Cuenta Externa'
                    };
                }

                // Para transacciones IPN (Pago recibido vía IPN)
                // Si ya tiene account_name, respetar ese valor (viene de la BD)
                if (tx.account_name) {
                    return tx;
                }

                // Si no tiene account_name pero tiene accountName, usarlo
                const txWithFields = tx as Transaction & { accountName?: string };
                if (txWithFields.accountName) {
                    return {
                        ...tx,
                        account_name: txWithFields.accountName
                    };
                }

                // Si tiene account_holder, usarlo como fallback
                if (tx.account_holder) {
                    return {
                        ...tx,
                        account_name: tx.account_holder
                    };
                }

                // Último recurso: asignar No disponible
                return {
                    ...tx,
                    account_name: 'No disponible'
                };
            });

            setTransactions(processedDeposits);
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

    const handleFilterChange = (newFilters: TransactionFilterType) => {
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
        <div className="container mx-auto py-4">
            <div className="flex flex-col gap-6">
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Depósitos Directos</CardTitle>
                                <CardDescription>
                                    Depósitos pendientes recibidos directamente en nuestra cuenta bancaria
                                </CardDescription>
                            </div>
                            <Button
                                onClick={fetchTransactions}
                                disabled={isLoading}
                                variant="outline"
                                size="sm"
                                className="h-8"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Actualizando...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Actualizar
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading && transactions.length === 0 ? (
                            <div className="flex justify-center items-center h-64">
                                <Loader2 className="animate-spin h-8 w-8" />
                                <span className="ml-2">Cargando transacciones...</span>
                            </div>
                        ) : error ? (
                            <div className="border border-red-400 bg-red-100 text-red-700 p-4 rounded-md">
                                <p>{error}</p>
                            </div>
                        ) : (
                            <>
                                <TransactionFilters
                                    onChange={handleFilterChange}
                                    onReset={handleResetFilters}
                                />

                                <TransactionTable
                                    transactions={filteredTransactions}
                                    onTransactionApproved={handleTransactionApproved}
                                    onTransactionRejected={handleTransactionRejected}
                                    onRefresh={fetchTransactions}
                                    hideIdColumn={true}
                                />
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 