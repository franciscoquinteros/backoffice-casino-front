// app/dashboard/transactions/withdrawals-pending/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  TransactionTable
} from '../../../../components/transaction-table';
import {
  TransactionFilters
} from '../../../../components/transaction-filters';
import {
  Transaction,
  TransactionFilter,
  transactionService
} from '@/components/transaction-service';
import { TableSkeleton } from '@/components/ui/table-skeleton';

export default function WithdrawalsPendingPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [filters, setFilters] = useState<TransactionFilter>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función para cargar transacciones - extraída para poder reutilizarla
  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await transactionService.getTransactions();
      setTransactions(data);

      // Filtrar retiros pendientes
      const pendingWithdrawals = transactionService.filterTransactions(
        data,
        'withdraw',
        'Pending',
        filters
      );
      setFilteredTransactions(pendingWithdrawals);
      setError(null);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('No se pudieron cargar las transacciones');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Cargar transacciones inicialmente
  useEffect(() => {
    fetchTransactions();

    // Actualización periódica (30 segundos)
    const intervalId = setInterval(fetchTransactions, 30000);
    return () => clearInterval(intervalId);
  }, [fetchTransactions]); // Agregado fetchTransactions como dependencia

  // Actualizar cuando cambian los filtros
  useEffect(() => {
    if (transactions.length > 0) {
      const filtered = transactionService.filterTransactions(
        transactions,
        'withdraw',
        'Pending',
        filters
      );
      setFilteredTransactions(filtered);
    }
  }, [filters, transactions]);

  // Manejar cambios en los filtros
  const handleFilterChange = (newFilters: TransactionFilter) => {
    setFilters(newFilters);
  };

  // Resetear filtros
  const handleResetFilters = () => {
    setFilters({});
  };

  // Manejar la aprobación de una transacción
  const handleTransactionApproved = async (updatedTransaction: Transaction) => {
    try {
      // Actualizar la transacción en la base de datos
      await transactionService.approveTransaction(updatedTransaction);

      // Recargar los datos para reflejar el cambio
      await fetchTransactions();

      console.log('Transacción aprobada y datos recargados');
    } catch (error) {
      console.error('Error al aprobar la transacción:', error);
    }
  };

  // Manejar el rechazo de una transacción
  const handleTransactionRejected = async (rejectedTransaction: Transaction) => {
    try {
      // Actualizar la transacción en la base de datos
      await transactionService.rejectTransaction(rejectedTransaction);

      // Recargar los datos para reflejar el cambio
      await fetchTransactions();

      console.log('Transacción rechazada y datos recargados');
    } catch (error) {
      console.error('Error al rechazar la transacción:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl font-bold">Retiros Pendientes</CardTitle>
          <CardDescription>
            Gestione los retiros que requieren aprobación
          </CardDescription>
        </CardHeader>

        <div className="p-6 pt-3">
          {/* Filtros */}
          <TransactionFilters
            onChange={handleFilterChange}
            onReset={handleResetFilters}
          />

          {/* Tabla de transacciones */}
          {isLoading ? (
            <TableSkeleton columns={[]} rowCount={5} />
          ) : error ? (
            <Card className="p-8 text-center">
              <p className="text-red-500">{error}</p>
            </Card>
          ) : (
            <TransactionTable
              transactions={filteredTransactions}
              showApproveButton={true}
              onTransactionApproved={handleTransactionApproved}
              onTransactionRejected={handleTransactionRejected}
            />
          )}
        </div>
      </Card>
    </div>
  );
}