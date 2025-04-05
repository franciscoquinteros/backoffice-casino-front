// app/dashboard/transactions/deposits-pending/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle } from "lucide-react";
import Link from 'next/link';
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

export default function DepositsPendingPage() {
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
    };

    fetchTransactions();

    // Actualización periódica (30 segundos)
    const intervalId = setInterval(fetchTransactions, 30000);
    return () => clearInterval(intervalId);
  }, []);

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
  const handleTransactionApproved = (updatedTransaction: Transaction) => {
    // Actualizar las transacciones en estado
    setTransactions(prev => 
      prev.map(tx => tx.id === updatedTransaction.id ? updatedTransaction : tx)
    );
    
    // El filtrado automático se realizará en el efecto
  };

  // Contadores para pestañas de navegación
  const pendingDepositsCount = transactions.filter(
    tx => tx.type === 'deposit' && tx.status === 'Pending'
  ).length;
  
  const completedDepositsCount = transactions.filter(
    tx => tx.type === 'deposit' && (tx.status === 'Aceptado' || tx.status === 'approved')
  ).length;
  
  const pendingWithdrawalsCount = transactions.filter(
    tx => tx.type === 'withdraw' && tx.status === 'Pending'
  ).length;
  
  const completedWithdrawalsCount = transactions.filter(
    tx => tx.type === 'withdraw' && (tx.status === 'Aceptado' || tx.status === 'approved')
  ).length;

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl font-bold">Depósitos Pendientes</CardTitle>
          <CardDescription>
            Gestione los depósitos que requieren aprobación
          </CardDescription>
        </CardHeader>
        
        {/* Tabs de navegación */}
        <div className="px-6">
          <Tabs defaultValue="deposits-pending" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger 
                value="deposits-pending" 
                className="flex items-center justify-center"
                asChild
              >
                <Link href="/dashboard/transactions/deposits-pending" className="w-full flex items-center justify-center">
                  <Clock className="mr-2 h-4 w-4" />
                  <span>Depósitos Pendientes</span>
                  <Badge className="ml-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                    {pendingDepositsCount}
                  </Badge>
                </Link>
              </TabsTrigger>
              
              <TabsTrigger 
                value="deposits-completed" 
                className="flex items-center justify-center"
                asChild
              >
                <Link href="/dashboard/transactions/deposits-completed" className="w-full flex items-center justify-center">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  <span>Depósitos Completados</span>
                  <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-100">
                    {completedDepositsCount}
                  </Badge>
                </Link>
              </TabsTrigger>
              
              <TabsTrigger 
                value="withdrawals-pending" 
                className="flex items-center justify-center"
                asChild
              >
                <Link href="/dashboard/transactions/withdrawals-pending" className="w-full flex items-center justify-center">
                  <Clock className="mr-2 h-4 w-4" />
                  <span>Retiros Pendientes</span>
                  <Badge className="ml-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                    {pendingWithdrawalsCount}
                  </Badge>
                </Link>
              </TabsTrigger>
              
              <TabsTrigger 
                value="withdrawals-completed" 
                className="flex items-center justify-center"
                asChild
              >
                <Link href="/dashboard/transactions/withdrawals-completed" className="w-full flex items-center justify-center">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  <span>Retiros Completados</span>
                  <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-100">
                    {completedWithdrawalsCount}
                  </Badge>
                </Link>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
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
            />
          )}
        </div>
      </Card>
    </div>
  );
}