// app/dashboard/transactions/deposits-completed/page.tsx
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
        
        // Filtrar depósitos completados
        const completedDeposits = transactionService.filterTransactions(
          data, 
          'deposit', 
          'Aceptado',
          filters
        );
        
        // También incluir los que están marcados como 'approved'
        const approvedDeposits = transactionService.filterTransactions(
          data, 
          'deposit', 
          'approved',
          filters
        );
        
        setFilteredTransactions([...completedDeposits, ...approvedDeposits]);
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
      // Filtrar depósitos completados
      const completedDeposits = transactionService.filterTransactions(
        transactions, 
        'deposit', 
        'Aceptado',
        filters
      );
      
      // También incluir los que están marcados como 'approved'
      const approvedDeposits = transactionService.filterTransactions(
        transactions, 
        'deposit', 
        'approved',
        filters
      );
      
      setFilteredTransactions([...completedDeposits, ...approvedDeposits]);
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
          <CardTitle className="text-2xl font-bold">Depósitos Completados</CardTitle>
          <CardDescription>
            Historial de depósitos aprobados
          </CardDescription>
        </CardHeader>
        
        {/* Tabs de navegación */}
        <div className="px-6">
          <Tabs defaultValue="deposits-completed" className="w-full">
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
              showApproveButton={false}
            />
          )}
        </div>
      </Card>
    </div>
  );
}