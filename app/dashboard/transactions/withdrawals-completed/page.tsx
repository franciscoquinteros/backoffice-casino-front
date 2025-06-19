// app/dashboard/transactions/withdrawals-completed/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// --- Asegúrate que las rutas sean correctas ---
import { TransactionTable } from '@/components/transaction-table';
import { TransactionFilters } from '@/components/transaction-filters';
import { Transaction, TransactionFilter, transactionService } from '@/components/transaction-service';
import { TableSkeleton, type ColumnConfig } from '@/components/ui/table-skeleton';
// import { toast } from 'sonner'; // Descomenta si usas toast aquí

export default function WithdrawalsCompletedPage() {
  const { data: session, status: sessionStatus } = useSession();

  const [allOfficeTransactions, setAllOfficeTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [filters, setFilters] = useState<TransactionFilter>({});
  const [isLoading, setIsLoading] = useState(true); // Carga inicial
  const [isRefreshing, setIsRefreshing] = useState(false); // Carga en segundo plano
  const [error, setError] = useState<string | null>(null);

  // --- Columnas para Skeleton ---
  const tableColumns: ColumnConfig[] = [ /* ... tu config ... */];

  // --- fetchTransactions CORREGIDO ---
  const fetchTransactions = useCallback(async (isRefresh = false) => { // Cambiado flag
    console.log('*** WITHDRAW COMPLETED - fetchTransactions INICIANDO ***', { isRefresh });

    if (sessionStatus !== "authenticated" || !session?.user?.officeId || !session?.accessToken) {
      if (sessionStatus === "authenticated") setError("Datos de sesión incompletos.");
      setIsLoading(false); setIsRefreshing(false); return;
    }
    const officeId = session.user.officeId;
    const accessToken = session.accessToken;

    if (!isRefresh) setIsLoading(true); // Carga inicial
    else setIsRefreshing(true);         // Recarga
    setError(null);

    try {
      const endpoint = `${process.env.NEXT_PUBLIC_BACKEND_URL}/transactions/${officeId}`;
      console.log(`Workspaceing transactions for office ${officeId} from: ${endpoint}`);
      const data = await transactionService.getTransactionsForOffice(officeId, accessToken);
      console.log(`Workspaceed ${data.length} total transactions for office ${officeId}`);

      setAllOfficeTransactions(data); // Guarda base

      // Filtra INMEDIATAMENTE para esta página (Retiros Completados + Filtros UI)
      const completedWithdrawals = transactionService.filterTransactions(
        data,
        'withdraw', // <-- Tipo correcto
        'Aceptado', // <-- Estado completado (incluye rechazados si tu servicio lo hace)
        filters
      );
      console.log(`Filtered down to ${completedWithdrawals.length} completed withdrawals matching UI filters.`);
      setFilteredTransactions(completedWithdrawals);

    } catch (err: unknown) { // Usa unknown
      console.error('Error fetching transactions (Withdrawals Completed):', err);
      const message = err instanceof Error ? err.message : 'No se pudieron cargar las transacciones';
      setError(message);
      setAllOfficeTransactions([]); setFilteredTransactions([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      console.log('*** WITHDRAW COMPLETED - fetchTransactions FINALIZANDO ***');
    }
    // --- Dependencias CORREGIDAS ---
  }, [session, sessionStatus, setError, filters]); // Quitado 'filters'


  // --- useEffect para Carga Inicial ---
  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchTransactions(true); // true para carga inicial
    } else if (sessionStatus === "unauthenticated") {
      setIsLoading(false);
      setError("Necesitas iniciar sesión.");
    }
  }, [sessionStatus, fetchTransactions]); // Correcto


  // --- useEffect para la Actualización Periódica ---
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (sessionStatus === "authenticated") {
      console.log("Setting up interval fetch (Withdrawals Completed)...");
      intervalId = setInterval(() => {
        console.log("Interval fetch triggered (Withdrawals Completed)...");
        fetchTransactions(true); // Llama con true para activar isRefreshing
      }, 30000); // 30 segundos
    }
    return () => { // Limpieza
      if (intervalId) {
        console.log("Clearing interval fetch (Withdrawals Completed).");
        clearInterval(intervalId);
      }
    };
    // Ahora fetchTransactions es estable
  }, [sessionStatus, fetchTransactions]);


  // --- useEffect para RE-FILTRAR en cliente ---
  useEffect(() => {
    console.log("Re-filtering completed withdrawals based on UI filters or new data...");
    const filtered = transactionService.filterTransactions(
      allOfficeTransactions,
      'withdraw', // <-- Tipo correcto
      'Aceptado', // <-- Estado correcto
      filters
    );
    setFilteredTransactions(filtered);
  }, [filters, allOfficeTransactions]); // Correcto


  // Manejadores de filtros (sin cambios)
  const handleFilterChange = (newFilters: TransactionFilter) => setFilters(newFilters);
  const handleResetFilters = () => setFilters({});

  // No hay acciones aquí


  // --- Renderizado ---
  if (sessionStatus === "loading") { /* ... Skeleton Sesión ... */ }
  if (sessionStatus === "unauthenticated") { /* ... Mensaje Login ... */ }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl font-bold">Retiros Completados</CardTitle>
          <CardDescription> Historial de retiros aprobados o rechazados (Oficina: {session?.user?.officeId || 'N/A'}) </CardDescription>
        </CardHeader>
        <div className="p-6 pt-3">
          <TransactionFilters onChange={handleFilterChange} onReset={handleResetFilters} />

          {/* Muestra skeleton solo en carga inicial */}
          {isLoading && filteredTransactions.length === 0 ? (
            <TableSkeleton columns={tableColumns} rowCount={5} />
          ) : error ? (
            <Card className="p-8 text-center"><p className="text-red-500">{error}</p></Card>
          ) : (
            <TransactionTable
              transactions={filteredTransactions}
              showApproveButton={false}
              onTransactionApproved={() => { }}
              onTransactionRejected={() => { }}
              isRefreshing={isRefreshing}
              hideIdColumn={true}
              showUsernameColumn={true}
              showWhatsAppColumn={true}
              hideReferenceColumn={true}
            />
          )}
        </div>
      </Card>
    </div>
  );
}