// app/dashboard/transactions/withdraw-pending/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from "next-auth/react"; // Importa useSession
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Transaction,
  TransactionFilter,
  transactionService
} from '@/components/transaction-service'; // Ajusta ruta si es necesario
import { TableSkeleton } from '@/components/ui/table-skeleton'; // Ajusta ruta
import { toast } from "sonner";
import { TransactionTable } from '@/components/transaction-table2';
import { TransactionFilters } from '@/components/transaction-filters';


// --- 1. Cambia el nombre del componente ---
export default function WithdrawPendingPage() {
  const { data: session, status: sessionStatus } = useSession(); // Obtiene sesión

  // Estados (sin cambios en la lógica)
  const [allOfficeTransactions, setAllOfficeTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [filters, setFilters] = useState<TransactionFilter>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función fetchTransactions (la lógica interna es la misma, el filtrado específico viene después)
  const fetchTransactions = useCallback(async (isInitialLoad = false) => {
    if (sessionStatus !== "authenticated" || !session?.user?.officeId || !session?.accessToken) {
      // ... (manejo de sesión no lista o incompleta) ...
      if (!isInitialLoad) setIsLoading(false);
      if (sessionStatus === "authenticated") { setError("Datos de sesión incompletos."); }
      return;
    }
    const officeId = session.user.officeId;
    const accessToken = session.accessToken;

    if (isInitialLoad) { setIsLoading(true); setError(null); }

    try {
      console.log(`Workspaceing transactions for pending withdrawals - Office: ${officeId}...`);
      const data = await transactionService.getTransactionsForOffice(officeId, accessToken);
      setAllOfficeTransactions(data);

      // --- 2. Filtra para RETIROS PENDIENTES al recibir datos ---
      const pendingWithdrawals = transactionService.filterTransactions(
        data,
        'withdraw', // <-- CAMBIADO
        'Pending',
        filters
      );

      // Actualizar ambos estados de manera atómica para evitar renders innecesarios
      setFilteredTransactions(pendingWithdrawals);

      if (isInitialLoad) setError(null);

    } catch (err: unknown) {
      console.error('Error fetching transactions (Withdraw Pending):', err);
      setError("Error al cargar transacciones. Intenta de nuevo más tarde.");
    } finally {
      setIsLoading(false);
    }
  }, [filters, session, sessionStatus]);

  // useEffect para carga inicial (sin cambios)
  useEffect(() => {
    if (sessionStatus === "authenticated") { fetchTransactions(true); }
    else if (sessionStatus === "unauthenticated") { setIsLoading(false); setError("Necesitas iniciar sesión."); }
  }, [sessionStatus, fetchTransactions]);

  // useEffect para intervalo (sin cambios)
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (sessionStatus === "authenticated") {
      intervalId = setInterval(() => fetchTransactions(false), 30000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [sessionStatus, fetchTransactions]);

  // useEffect para re-filtrar (cambia el tipo en el filtro)
  useEffect(() => {
    const filtered = transactionService.filterTransactions(
      allOfficeTransactions,
      'withdraw', // <-- Tipo correcto
      'Pending',  // <-- Estado correcto
      filters
    );
    setFilteredTransactions(filtered);
  }, [filters, allOfficeTransactions]); // <-- Dependencias correctas

  // Manejadores de filtros (sin cambios)
  const handleFilterChange = (newFilters: TransactionFilter) => setFilters(newFilters);
  const handleResetFilters = () => setFilters({});

  // Handlers de acciones (sin cambios en la lógica, ya usan accessToken)
  const handleTransactionApproved = async (transaction: Transaction) => {
    if (!session?.accessToken) { toast.error("No autenticado"); return; }
    const accessToken = session.accessToken;
    try {
      const result = await transactionService.approveTransaction(transaction, accessToken);
      if (result.success) { toast.success("Retiro aprobado"); fetchTransactions(false); }
      else { toast.error(`Error: ${result.error || 'Desconocido'}`); }
    } catch (error: unknown) { toast.error(`Error: ${error instanceof Error ? error.message : 'Inesperado'}`); }
  };

  const handleTransactionRejected = async (rejectedTransaction: Transaction) => {
    if (!session?.accessToken) { toast.error("No autenticado"); return; }
    const accessToken = session.accessToken;
    try {
      await transactionService.rejectTransaction(rejectedTransaction, accessToken);
      toast.success("Retiro rechazado");
      fetchTransactions(false);
    } catch (error: unknown) { toast.error(`Error: ${error instanceof Error ? error.message : 'Inesperado'}`); }
  };

  // Renderizado condicional (sin cambios)
  if (sessionStatus === "loading") { /* ... Loading UI ... */ return <div>Cargando Sesión...</div>; }
  if (sessionStatus === "unauthenticated") { /* ... Unauthenticated UI ... */ return <div>Login Requerido</div>; }

  // Renderizado principal
  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader className="pb-3">
          {/* --- 4. Cambia Títulos/Descripciones --- */}
          <CardTitle className="text-2xl font-bold">Retiros Pendientes</CardTitle>
          <CardDescription>
            Gestione los retiros que requieren aprobación (Oficina: {session?.user?.officeId || 'N/A'})
          </CardDescription>
        </CardHeader>

        <div className="p-6 pt-3">
          <TransactionFilters onChange={handleFilterChange} onReset={handleResetFilters} />

          {isLoading && allOfficeTransactions.length === 0 ? (
            <TableSkeleton columns={[]} rowCount={5} />
          ) : error ? (
            <Card className="p-8 text-center"><p className="text-red-500">{error}</p></Card>
          ) : (
            <TransactionTable
              transactions={filteredTransactions}
              showApproveButton={true}
              onTransactionApproved={handleTransactionApproved}
              onTransactionRejected={handleTransactionRejected}
              isRefreshing={isLoading && allOfficeTransactions.length > 0}
              hideIdColumn={true}
            />
          )}
        </div>
      </Card>
    </div>
  );
}