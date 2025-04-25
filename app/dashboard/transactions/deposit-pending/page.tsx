// app/dashboard/transactions/deposit-pending/page.tsx
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
import { ErrorModal } from '@/components/error-modal';

export default function DepositsPendingPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [filters, setFilters] = useState<TransactionFilter>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para el modal de error
  const [errorModalInfo, setErrorModalInfo] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
  }>({
    isOpen: false,
    title: '',
    description: ''
  });

  // Función para cargar transacciones - extraída para poder reutilizarla
  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await transactionService.getTransactions();
      setTransactions(data);
      
      // Filtrar depósitos pendientes
      const pendingDeposits = transactionService.filterTransactions(
        data, 
        'deposit', 
        'Pending',
        filters
      );
      setFilteredTransactions(pendingDeposits);
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
        'deposit', 
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
  const handleTransactionApproved = async (transaction: Transaction) => {
    try {
      // Versión mejorada que devuelve un objeto con el resultado
      const result = await transactionService.approveTransaction(transaction);
      
      if (result.success) {
        // Recargar los datos para reflejar el cambio
        await fetchTransactions();
        console.log('Transacción aprobada y datos recargados');
      } else {
        // Mostrar error en el modal
        setErrorModalInfo({
          isOpen: true,
          title: 'Error al procesar la transacción',
          description: result.error || 'No se pudo completar la operación. Por favor, intente nuevamente.'
        });
      }
    } catch (error: any) {
      console.error('Error al aprobar la transacción:', error);
      setErrorModalInfo({
        isOpen: true,
        title: 'Error inesperado',
        description: error.message || 'Ocurrió un error al procesar la solicitud.'
      });
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
    } catch (error: any) {
      console.error('Error al rechazar la transacción:', error);
      setErrorModalInfo({
        isOpen: true,
        title: 'Error al rechazar la transacción',
        description: error.message || 'No se pudo rechazar la transacción. Por favor, intente nuevamente.'
      });
    }
  };

  // Cerrar el modal de error
  const closeErrorModal = () => {
    setErrorModalInfo(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl font-bold">Depósitos Pendientes</CardTitle>
          <CardDescription>
            Gestione los depósitos que requieren aprobación
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
      
      {/* Modal de error */}
      <ErrorModal
        isOpen={errorModalInfo.isOpen}
        title={errorModalInfo.title}
        description={errorModalInfo.description}
        onClose={closeErrorModal}
      />
    </div>
  );
}