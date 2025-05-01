// app/dashboard/transactions/withdrawals-completed/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from "next-auth/react"; // <-- 1. Importa useSession
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TransactionTable } from '../../../../components/transaction-table'; // Ajusta ruta
import { TransactionFilters } from '../../../../components/transaction-filters'; // Ajusta ruta
import {
  Transaction,
  TransactionFilter,
  transactionService
} from '@/components/transaction-service'; // Ajusta ruta
import { TableSkeleton } from '@/components/ui/table-skeleton'; // Ajusta ruta
import { toast } from "sonner"; // Opcional

// Interfaz para errores (opcional)
interface TransactionError extends Error {
  message: string;
}

export default function WithdrawalsCompletedPage() { // <-- Nombre del componente
  // --- 2. Obtiene la sesión y el estado ---
  const { data: session, status: sessionStatus } = useSession();

  // Estados del componente
  const [allOfficeTransactions, setAllOfficeTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [filters, setFilters] = useState<TransactionFilter>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- 3. Función useCallback para cargar datos del backend ---
  const fetchTransactions = useCallback(async (isInitialLoad = false) => {
    // Verifica sesión antes de llamar
    if (sessionStatus !== "authenticated" || !session?.user?.officeId || !session?.accessToken) {
      console.log("Fetch prevented (Withdrawals Completed): Session not ready or missing data.", { sessionStatus });
      if (!isInitialLoad) setIsLoading(false);
      if (sessionStatus === "authenticated") { setError("Datos de sesión incompletos."); }
      return;
    }
    const officeId = session.user.officeId;
    const accessToken = session.accessToken;

    if (isInitialLoad) { setIsLoading(true); setError(null); }

    try {
      console.log(`Workspaceing transactions for completed withdrawals - Office: ${officeId}...`);
      // Llama al servicio CON officeId y accessToken
      const data = await transactionService.getTransactionsForOffice(officeId, accessToken);
      setAllOfficeTransactions(data); // Guarda datos base

      // --- 4. Filtra INMEDIATAMENTE para esta página (Retiros Completados) ---
      // Tu servicio ya combina Aceptado/approved/Rechazado al pedir 'Aceptado'
      const completedWithdrawals = transactionService.filterTransactions(
        data,
        'withdraw',  // <--- Cambiado a 'withdraw'
        'Aceptado', // <--- Mantenido en 'Aceptado' (incluye rechazados)
        filters
      );
      setFilteredTransactions(completedWithdrawals); // Actualiza las transacciones a mostrar

      if (isInitialLoad) setError(null);

    } catch (err: any) {
      console.error('Error fetching transactions (Withdrawals Completed):', err);
      const errorMsg = err.message || 'No se pudieron cargar las transacciones';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [filters, session, sessionStatus]); // Depende de filtros, sesión y status


  // --- 5. useEffect para la Carga Inicial ---
  useEffect(() => {
    if (sessionStatus === "authenticated") {
      console.log("Session authenticated, performing initial fetch (Withdrawals Completed).");
      fetchTransactions(true);
    } else if (sessionStatus === "unauthenticated") {
      setIsLoading(false);
      setError("Necesitas iniciar sesión.");
    }
  }, [sessionStatus, fetchTransactions]);


  // --- 6. useEffect para la Actualización Periódica ---
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (sessionStatus === "authenticated") {
      console.log("Setting up interval fetch (Withdrawals Completed)...");
      intervalId = setInterval(() => {
        console.log("Interval fetch triggered (Withdrawals Completed)...");
        fetchTransactions(false);
      }, 30000);
    }
    return () => {
      if (intervalId) {
        console.log("Clearing interval fetch (Withdrawals Completed).");
        clearInterval(intervalId);
      }
    };
  }, [sessionStatus, fetchTransactions]);


  // --- 7. useEffect para RE-FILTRAR en el cliente ---
  useEffect(() => {
    if (allOfficeTransactions.length > 0) {
      console.log("Applying client-side filters (Withdrawals Completed)...");
      // --- CAMBIO: Filtra para RETIROS COMPLETADOS ---
      const filtered = transactionService.filterTransactions(
        allOfficeTransactions,
        'withdraw', // <--- Tipo: Retiro
        'Aceptado', // <--- Estado: Completado (incluye rechazados)
        filters
      );
      setFilteredTransactions(filtered);
    } else if (filteredTransactions.length > 0) {
      setFilteredTransactions([]);
    }
  }, [filters, allOfficeTransactions]); // Depende de filtros y datos base


  // Manejadores de filtros (sin cambios)
  const handleFilterChange = (newFilters: TransactionFilter) => setFilters(newFilters);
  const handleResetFilters = () => setFilters({});

  // No hay acciones de aprobar/rechazar aquí


  // --- 8. Renderizado Condicional ---
  if (sessionStatus === "loading") {
    return (
      <div className="container mx-auto p-4">
        <Card><CardHeader><CardTitle>Cargando Sesión...</CardTitle></CardHeader>
          <div className="p-6 pt-3"><TableSkeleton columns={[]} rowCount={5} /></div>
        </Card>
      </div>
    );
  }

  if (sessionStatus === "unauthenticated") {
    return <div className="container mx-auto p-4">Necesitas iniciar sesión para ver el historial.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader className="pb-3">
          {/* --- CAMBIO: Títulos y descripción --- */}
          <CardTitle className="text-2xl font-bold">Retiros Completados</CardTitle>
          <CardDescription>
            Historial de retiros aprobados o rechazados (Oficina: {session?.user?.officeId || 'N/A'})
          </CardDescription>
        </CardHeader>

        <div className="p-6 pt-3">
          <TransactionFilters
            onChange={handleFilterChange}
            onReset={handleResetFilters}
          />

          {isLoading && allOfficeTransactions.length === 0 ? (
            <TableSkeleton columns={[]} rowCount={5} />
          ) : error ? (
            <Card className="p-8 text-center"><p className="text-red-500">{error}</p></Card>
          ) : (
            <TransactionTable
              transactions={filteredTransactions}
              // No muestra botones de acción para completados
              showApproveButton={false}
              // No necesita pasar handlers
              isRefreshing={isLoading && allOfficeTransactions.length > 0}
            />
          )}
        </div>
      </Card>
    </div>
  );
}