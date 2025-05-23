// app/dashboard/transactions/deposit-completed/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// --- Asegúrate que las rutas sean correctas ---
import { TransactionTable } from '@/components/transaction-table';
import { TransactionFilters } from '@/components/transaction-filters';
import { Transaction, TransactionFilter as TransactionFilterType, transactionService } from '@/components/transaction-service';
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// --- Quita TransactionError si no la usas ---
// interface TransactionError extends Error { message: string; }

export default function DepositsCompletedPage() {
    const { data: session, status: sessionStatus } = useSession();

    const [allOfficeTransactions, setAllOfficeTransactions] = useState<Transaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
    const [filters, setFilters] = useState<TransactionFilterType>({});
    const [isLoading, setIsLoading] = useState(true); // Carga inicial
    const [isRefreshing, setIsRefreshing] = useState(false); // Carga en segundo plano (intervalo/manual)
    const [error, setError] = useState<string | null>(null);

    // --- fetchTransactions CORREGIDO ---
    const fetchTransactions = useCallback(async (isRefresh = false) => { // Cambiado nombre de flag para claridad
        console.log('*** DEPOSIT COMPLETED - fetchTransactions INICIANDO ***', { isRefresh }); // <-- LOG INICIO

        if (sessionStatus !== "authenticated" || !session?.user?.officeId || !session?.accessToken) {
            // ... (manejo sesión no lista, no cambia) ...
            if (sessionStatus === "authenticated") setError("Datos de sesión incompletos.");
            // Detiene indicadores de carga si falla la verificación inicial
            setIsLoading(false);
            setIsRefreshing(false);
            return;
        }
        const officeId = session.user.officeId;
        const accessToken = session.accessToken;

        // Decide qué indicador mostrar
        if (!isRefresh) setIsLoading(true); // Carga inicial completa
        else setIsRefreshing(true); // Recarga en segundo plano
        setError(null);

        try {
            // Llama al servicio para obtener TODAS las transacciones de la oficina
            const endpoint = `${process.env.NEXT_PUBLIC_BACKEND_URL}/transactions/${officeId}`; // Asume que tu servicio/controller usa path param
            console.log(`Workspaceing transactions for office ${officeId} from: ${endpoint}`);
            const data = await transactionService.getTransactionsForOffice(officeId, accessToken); // Llama al servicio cliente
            console.log(`Workspaceed ${data.length} total transactions for office ${officeId}`);

            setAllOfficeTransactions(data); // Guarda la lista base completa

            // Filtra INMEDIATAMENTE para esta página (Completados + Filtros UI)
            const completedFiltered = transactionService.filterTransactions(
                data, 'deposit', 'Aceptado', filters
            );
            console.log(`Filtered down to ${completedFiltered.length} completed deposits matching UI filters.`);
            setFilteredTransactions(completedFiltered); // Actualiza la vista

        } catch (err: unknown) { // Usa unknown
            console.error('Error fetching transactions (Completed Page):', err);
            const message = err instanceof Error ? err.message : 'No se pudieron cargar las transacciones';
            setError(message);
            // No pongas toast en fetch automático, solo quizás en el manual
            setAllOfficeTransactions([]); // Limpia datos en error
            setFilteredTransactions([]);
        } finally {
            setIsLoading(false); // Quita carga inicial
            setIsRefreshing(false); // Quita carga de refresco
            console.log('*** DEPOSIT COMPLETED - fetchTransactions FINALIZANDO ***');
        }
        // --- Dependencias CORREGIDAS: Solo session y status ---
        // Quita 'filters' porque el filtro se aplica DESPUÉS de recibir datos
    }, [session, sessionStatus, setError, filters]); // Añade setError como dependencia estable


    // --- useEffect para Carga Inicial ---
    useEffect(() => {
        if (sessionStatus === "authenticated") {
            fetchTransactions(true); // true para indicar carga inicial (mostrar skeleton grande)
        } else if (sessionStatus === "unauthenticated") {
            setIsLoading(false);
            setError("Necesitas iniciar sesión.");
        }
    }, [sessionStatus, fetchTransactions]); // Correcto


    // --- useEffect para la Actualización Periódica ---
    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;
        if (sessionStatus === "authenticated") {
            console.log("Setting up interval fetch (Completed Page)...");
            intervalId = setInterval(() => {
                console.log("Interval fetch triggered (Completed Page)...");
                fetchTransactions(true); // Llama con true para que ponga isRefreshing=true
            }, 30000); // 30 segundos
        }
        // Limpieza: se ejecuta al desmontar o ANTES de la siguiente ejecución si las deps cambian
        return () => {
            if (intervalId) {
                console.log("Clearing interval fetch (Completed Page).");
                clearInterval(intervalId);
            }
        };
        // Ahora fetchTransactions es estable, por lo que el intervalo no debería reiniciarse constantemente
    }, [sessionStatus, fetchTransactions]);


    // --- useEffect para RE-FILTRAR en cliente cuando cambian filtros de UI o datos base ---
    useEffect(() => {
        console.log("Re-filtering completed deposits based on UI filters or new data...");
        // Aplica siempre el filtro de la página + los filtros de UI
        const filtered = transactionService.filterTransactions(
            allOfficeTransactions, // Usa la lista base completa
            'deposit',             // Tipo fijo para esta página
            'Aceptado',           // Estado fijo para esta página
            filters                // Filtros actuales de la UI
        );
        setFilteredTransactions(filtered); // Actualiza la lista que se muestra en la tabla
    }, [filters, allOfficeTransactions]); // Correcto: depende de los filtros y los datos base


    // Handlers de filtros (sin cambios)
    const handleFilterChange = (newFilters: TransactionFilterType) => setFilters(newFilters);
    const handleResetFilters = () => setFilters({});


    // --- Renderizado ---
    if (sessionStatus === "loading") { /* ... Skeleton Sesión ... */ }
    if (sessionStatus === "unauthenticated") { /* ... Mensaje Login ... */ }

    return (
        <div className="container mx-auto py-4">
            <div className="flex flex-col gap-6">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-2xl font-bold">Depósitos Completados</CardTitle>
                        <CardDescription> Historial de depósitos aprobados o rechazados (Oficina: {session?.user?.officeId || 'N/A'}) </CardDescription>
                    </CardHeader>
                    <div className="p-6 pt-3">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <Loader2 className="animate-spin h-8 w-8" />
                                <span className="ml-2">Cargando transacciones...</span>
                            </div>
                        ) : error ? (
                            <div className="border border-red-400 bg-red-100 text-red-700 p-4 rounded-md">
                                <p>{error}</p>
                                <Button onClick={() => fetchTransactions(true)} className="mt-2">
                                    Reintentar
                                </Button>
                            </div>
                        ) : (
                            <>
                                <TransactionFilters
                                    onChange={handleFilterChange}
                                    onReset={handleResetFilters}
                                />

                                <TransactionTable
                                    transactions={filteredTransactions}
                                    isRefreshing={isRefreshing}
                                    isViewOnly={true}
                                    hideIdColumn={true}
                                />
                            </>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}