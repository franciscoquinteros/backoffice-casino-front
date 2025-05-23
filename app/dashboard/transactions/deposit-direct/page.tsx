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
import { toast } from "sonner";

export default function DepositsDirectPage() {
    const { data: session, status: sessionStatus } = useSession();

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
    const [filters, setFilters] = useState<TransactionFilterType>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [forceUpdateKey, setForceUpdateKey] = useState(0); // Para forzar re-render

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
                (tx.status === 'Pending' || tx.status === 'Asignado') &&
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

            // Ordenar por fecha de actualización (updated_at) primero, luego por fecha de creación
            const sortedDeposits = processedDeposits.sort((a, b) => {
                // Usar updated_at si está disponible, sino usar date_created
                const aDate = new Date(a.updated_at || a.date_created);
                const bDate = new Date(b.updated_at || b.date_created);

                // Ordenar de más reciente a más antiguo (descendente)
                return bDate.getTime() - aDate.getTime();
            });

            setTransactions(sortedDeposits);
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
        console.log(`🔄 [FilterEffect] Transacciones cambiaron. Total: ${transactions.length}, ForceUpdateKey: ${forceUpdateKey}`);
        if (transactions.length > 0) {
            const filtered = transactionService.applyFilters(transactions, filters);
            console.log(`🔄 [FilterEffect] Transacciones filtradas: ${filtered.length}`);
            setFilteredTransactions(filtered);
        } else {
            setFilteredTransactions([]);
        }
    }, [filters, transactions, forceUpdateKey]);

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

    // Función para cambiar el estado entre Pendiente y Asignado
    const handleStatusToggle = async (transaction: Transaction) => {
        if (!session?.accessToken) return;

        const originalStatus = transaction.status;
        const newStatus = transaction.status === 'Pending' ? 'Asignado' : 'Pending';

        console.log(`🔄 [StatusToggle] INICIO: Cambiando estado de transacción ${transaction.id}`);
        console.log(`🔄 [StatusToggle] Estado actual: ${originalStatus} → Nuevo estado: ${newStatus}`);

        try {
            // 1. NO actualizar estado local. Solo llamar al backend
            console.log(`🌐 [StatusToggle] Enviando petición al backend...`);
            const result = await transactionService.updateTransactionStatus(
                transaction.id,
                newStatus,
                session.accessToken
            );

            if (result.success) {
                console.log(`✅ [StatusToggle] Backend confirmó el cambio exitosamente`);
                toast.success(`Estado cambiado a ${newStatus} exitosamente`);
                // 2. Fetch inmediato de las transacciones desde el backend
                await fetchTransactions();
                // 3. Forzar re-render
                setForceUpdateKey(prev => prev + 1);
            } else {
                console.error(`❌ [StatusToggle] Backend rechazó el cambio:`, result.error);
                throw new Error(result.error || 'Error al cambiar el estado en el servidor');
            }
        } catch (err) {
            console.error(`❌ [StatusToggle] Error en handleStatusToggle:`, err);
            const errorMessage = err instanceof Error ? err.message : 'Error al cambiar el estado. Por favor, intente nuevamente.';
            setError(errorMessage);
            toast.error(errorMessage);
            // Recarga para asegurar consistencia
            await fetchTransactions();
            setForceUpdateKey(prev => prev + 1);
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
                                    key={`transactions-${forceUpdateKey}-${filteredTransactions.length}`}
                                    transactions={filteredTransactions}
                                    onTransactionApproved={handleTransactionApproved}
                                    onTransactionRejected={handleTransactionRejected}
                                    hideIdColumn={true}
                                    onStatusToggle={handleStatusToggle}
                                />
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 