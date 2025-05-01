// app/dashboard/transactions/deposit-completed/page.tsx
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

// Interfaz para errores (opcional, si la usas

export default function DepositsCompletedPage() {
    // --- 2. Obtiene la sesión y el estado ---
    const { data: session, status: sessionStatus } = useSession();

    // Estados del componente
    const [allOfficeTransactions, setAllOfficeTransactions] = useState<Transaction[]>([]); // Guarda TODAS las tx de la oficina
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]); // Las que se muestran (filtradas cliente + status/tipo)
    const [filters, setFilters] = useState<TransactionFilter>({}); // Filtros de la UI
    const [isLoading, setIsLoading] = useState(true); // Estado de carga general
    const [error, setError] = useState<string | null>(null);

    // --- 3. Función useCallback para cargar datos del backend ---
    const fetchTransactions = useCallback(async (isInitialLoad = false) => {
        // Verifica sesión antes de llamar
        if (sessionStatus !== "authenticated" || !session?.user?.officeId || !session?.accessToken) {
            console.log("Fetch prevented (Completed Page): Session not ready or missing data.", { sessionStatus });
            if (!isInitialLoad) setIsLoading(false); // Quita el loading si es recarga
            if (sessionStatus === "authenticated") {
                setError("Datos de sesión incompletos para cargar transacciones.");
                // No mostramos toast aquí para no ser molestos en recargas
            }
            // Si no está autenticado, el render lo manejará
            return; // No continuar
        }
        // Extrae datos de sesión
        const officeId = session.user.officeId;
        const accessToken = session.accessToken;

        // Marca como cargando si es la carga inicial
        if (isInitialLoad) {
            setIsLoading(true);
            setError(null);
        }

        try {
            console.log(`Workspaceing transactions for completed deposits - Office: ${officeId}...`);
            // Llama al servicio pasando officeId y token
            const data = await transactionService.getTransactionsForOffice(officeId, accessToken);

            // Guarda la lista completa de la oficina en el estado 'base'
            setAllOfficeTransactions(data);

            // --- 4. Filtra INMEDIATAMENTE para esta página (Depósitos Completados) ---
            // Usa los filtros ACTUALES de la UI (filters) sobre los datos NUEVOS (data)
            // Tu servicio ya combina Aceptado/approved/Rechazado al pedir 'Aceptado'
            const completedDeposits = transactionService.filterTransactions(
                data,
                'deposit',   // Tipo: Depósito
                'Aceptado', // Estado: 'Aceptado' (tu servicio maneja los otros estados completados)
                filters      // Filtros actuales de la UI
            );
            setFilteredTransactions(completedDeposits); // Actualiza las transacciones a mostrar

            // Limpia error si todo salió bien
            if (isInitialLoad) setError(null);

        } catch (err: unknown) {
            console.error('Error fetching transactions (Completed Page):', err);
            // No mostramos toast en recargas automáticas
            // if (isInitialLoad) toast.error(errorMsg);
        } finally {
            setIsLoading(false); // Quita el estado de carga
        }
        // Depende de la sesión/status para saber si puede ejecutar y con qué credenciales,
        // y de 'filters' para aplicar el filtro correcto inmediatamente después de recibir datos nuevos.
    }, [filters, session, sessionStatus]);


    // --- 5. useEffect para la Carga Inicial ---
    useEffect(() => {
        // Solo re-filtra si ya tenemos datos base de la oficina
        // Aplica filtros a la lista base y actualiza el estado filtrado
        const filtered = transactionService.filterTransactions(
            allOfficeTransactions, // Usa la lista completa ya cargada
            'deposit',             // Tipo para esta página
            'Aceptado',           // Estado para esta página (tu lógica maneja completados)
            filters                // Los filtros ACTUALES de la UI
        );
        setFilteredTransactions(filtered);
    }, [filters, allOfficeTransactions]);// Depende del status y de la función fetch


    // --- 6. useEffect para la Actualización Periódica ---
    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;
        if (sessionStatus === "authenticated") {
            console.log("Setting up interval fetch (Completed Page)...");
            intervalId = setInterval(() => {
                console.log("Interval fetch triggered (Completed Page)...");
                fetchTransactions(false); // false para no mostrar el skeleton grande
            }, 30000); // 30 segundos
        }
        return () => { // Limpieza al desmontar o cambiar status
            if (intervalId) {
                console.log("Clearing interval fetch (Completed Page).");
                clearInterval(intervalId);
            }
        };
    }, [sessionStatus, fetchTransactions]); // Depende del status y de la función fetch


    // --- 7. useEffect para RE-FILTRAR en el cliente cuando cambian los filtros de UI ---
    // Reemplaza el useEffect que causa el warning por este:
    useEffect(() => {
        // Solo re-filtra si ya tenemos datos base de la oficina
        // Aplica filtros a la lista base y actualiza el estado filtrado
        const filtered = transactionService.filterTransactions(
            allOfficeTransactions, // Usa la lista completa ya cargada
            'deposit',             // Tipo para esta página
            'Aceptado',           // Estado para esta página (tu lógica maneja completados)
            filters                // Los filtros ACTUALES de la UI
        );
        setFilteredTransactions(filtered);
    }, [filters, allOfficeTransactions]); // <-- Depende solo de filtros y datos base

    // Manejadores de filtros (sin cambios)
    const handleFilterChange = (newFilters: TransactionFilter) => setFilters(newFilters);
    const handleResetFilters = () => setFilters({});

    // No hay acciones de aprobar/rechazar en esta página

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

    // Renderizado principal cuando está autenticado
    return (
        <div className="container mx-auto p-4">
            <Card>
                <CardHeader className="pb-3">
                    {/* Título y Descripción actualizados */}
                    <CardTitle className="text-2xl font-bold">Depósitos Completados</CardTitle>
                    <CardDescription>
                        Historial de depósitos aprobados o rechazados (Oficina: {session?.user?.officeId || 'N/A'})
                    </CardDescription>
                </CardHeader>

                <div className="p-6 pt-3">
                    <TransactionFilters
                        onChange={handleFilterChange}
                        onReset={handleResetFilters}
                    />

                    {/* Muestra skeleton solo en la carga inicial */}
                    {isLoading && allOfficeTransactions.length === 0 ? (
                        <TableSkeleton columns={[]} rowCount={5} />
                    ) : error ? (
                        <Card className="p-8 text-center"><p className="text-red-500">{error}</p></Card>
                    ) : (
                        <TransactionTable
                            // Pasa las transacciones ya filtradas para esta vista
                            transactions={filteredTransactions}
                            // No muestra botones de acción
                            showApproveButton={false}
                            // No necesita pasar handlers si no hay botones
                            // onTransactionApproved={() => {}}
                            // onTransactionRejected={() => {}}
                            // Muestra un indicador si se está recargando en segundo plano
                            isRefreshing={isLoading && allOfficeTransactions.length > 0}
                        />
                    )}
                </div>
            </Card>
        </div>
    );
}