// app/dashboard/transactions/deposit-completed/page.tsx
"use client";

import { useState, useEffect } from 'react';
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

export default function DepositsCompletedPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [filters, setFilters] = useState<TransactionFilter>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar transacciones
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setIsLoading(true);
        const data = await transactionService.getTransactions();
        setTransactions(data);
        
        // Filtrar depósitos completados con los filtros actuales
        updateFilteredTransactions(data, filters);
        
        setError(null);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError('No se pudieron cargar las transacciones');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();

    // Actualización periódica (30 segundos)
    const intervalId = setInterval(fetchTransactions, 30000);
    return () => clearInterval(intervalId);
  }, [filters]); // Agregado filters como dependencia

  // Función para actualizar las transacciones filtradas
  const updateFilteredTransactions = (data: Transaction[], currentFilters: TransactionFilter) => {
    // Filtrar depósitos completados
    const completedDeposits = transactionService.filterTransactions(
      data, 
      'deposit', 
      'Aceptado',
      currentFilters
    );
    
    // También incluir los que están marcados como 'approved'
    const approvedDeposits = transactionService.filterTransactions(
      data, 
      'deposit', 
      'approved',
      currentFilters
    );
    
    setFilteredTransactions([...completedDeposits, ...approvedDeposits]);
  };

  // Actualizar cuando cambian los filtros o las transacciones
  useEffect(() => {
    if (transactions.length > 0) {
      updateFilteredTransactions(transactions, filters);
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

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl font-bold">Depósitos Completados</CardTitle>
          <CardDescription>
            Historial de depósitos aprobados
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
              showApproveButton={false}
            />
          )}
        </div>
      </Card>
    </div>
  );
}