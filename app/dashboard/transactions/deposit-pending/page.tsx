"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from "next-auth/react"; // <--- 1. Importa useSession
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TransactionTable } from '../../../../components/transaction-table';
import { TransactionFilters } from '../../../../components/transaction-filters';
import {
    Transaction,
    TransactionFilter,
    transactionService
} from '@/components/transaction-service'; // Ajusta la ruta si es necesario
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { toast } from "sonner"; // Para notificaciones

// Definimos una interfaz para errores (sin cambios)
interface TransactionError extends Error {
    message: string;
}

export default function DepositsPendingPage() {
    // --- 2. Obtiene la sesión y el estado de autenticación ---
    const { data: session, status: sessionStatus } = useSession();

    const [transactions, setTransactions] = useState<Transaction[]>([]); // Almacena TODAS las transacciones de la oficina
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]); // Las que se muestran después de filtros CLIENTE
    const [filters, setFilters] = useState<TransactionFilter>({});
    const [isLoading, setIsLoading] = useState(true); // Empieza cargando (sesión + datos iniciales)
    const [error, setError] = useState<string | null>(null);

    // Función para cargar transacciones
    const fetchTransactions = useCallback(async (isInitialLoad = false) => {
        // --- 3. Verifica la sesión antes de llamar al servicio ---
        if (sessionStatus !== "authenticated" || !session?.user?.officeId || !session?.accessToken) {
             console.log("Fetch prevented: Session not ready or missing data.", { sessionStatus, officeId: session?.user?.officeId, hasToken: !!session?.accessToken });
             // Si no está autenticado o faltan datos clave, no intentes cargar.
             // Podrías poner isLoading a false aquí si no es la carga inicial.
             if (!isInitialLoad) setIsLoading(false);
             // Si no está autenticado, el renderizado principal lo manejará.
             // Si está autenticado pero faltan datos, muestra error.
             if (sessionStatus === "authenticated") {
                  setError("Datos de sesión incompletos. Intenta re-loguearte.");
                  toast.error("Datos de sesión incompletos. Intenta re-loguearte.");
             }
            return; // No continuar
        }

        // Extrae los datos necesarios de la sesión
        const officeId = session.user.officeId;
        const accessToken = session.accessToken;

        try {
            if (isInitialLoad) {
                setIsLoading(true); // Loading solo en carga inicial
                setError(null); // Limpia errores previos en carga inicial
            }

            console.log(`Workspaceing transactions for office ${officeId}...`);
            // --- 4. Llama al servicio CON officeId y accessToken ---
            const data = await transactionService.getTransactionsForOffice(officeId, accessToken);

            // Guardamos los datos completos de la oficina
            setTransactions(data);

            // Aplicamos filtros CLIENTE iniciales (o los actuales) a los datos NUEVOS
            // y filtramos por estado 'Pending' y tipo 'deposit'
            const pendingDeposits = transactionService.filterTransactions(
                data,      // Usa los datos frescos
                'deposit',
                'Pending', // Solo queremos pendientes para esta página
                filters    // Aplica filtros de UI actuales
            );
            setFilteredTransactions(pendingDeposits);

            // Si todo fue bien y era carga inicial, limpiamos errores
            if(isInitialLoad) setError(null);

        } catch (err: unknown) {
            // No mostramos toast aquí para no molestar en las recargas automáticas
            // if (isInitialLoad) toast.error(errorMsg);
        } finally {
            // Siempre quita el loading state global al final (incluso si es recarga)
            setIsLoading(false);
        }
    // --- 5. Añade 'session' y 'sessionStatus' a las dependencias ---
    }, [filters, session, sessionStatus]);

    // Cargar transacciones inicialmente CUANDO la sesión esté lista
    useEffect(() => {
        if (sessionStatus === "authenticated") {
            console.log("Session authenticated, performing initial fetch.");
            fetchTransactions(true); // Pasar true para carga inicial
        } else if (sessionStatus === "unauthenticated") {
            console.log("Session unauthenticated.");
            setIsLoading(false); // No hay nada que cargar
            setError("Necesitas iniciar sesión.");
        }
        // Si el status es 'loading', esperamos a que cambie
    }, [sessionStatus, fetchTransactions]); // Depende del estado de la sesión y la función fetch

    // Actualización periódica (si la sesión está activa)
    useEffect(() => {
         let intervalId: NodeJS.Timeout | null = null;
        if (sessionStatus === "authenticated") {
            console.log("Setting up interval fetch...");
             intervalId = setInterval(() => {
                 console.log("Interval fetch triggered...");
                 fetchTransactions(false); // false para no mostrar loading grande
             }, 30000); // 30 segundos
        }
         // Limpia el intervalo si el componente se desmonta o el estado de sesión cambia
         return () => {
             if (intervalId) {
                 console.log("Clearing interval fetch.");
                 clearInterval(intervalId);
             }
         };
    }, [sessionStatus, fetchTransactions]); // Depende del estado de la sesión

    // Re-filtrar client-side CUANDO cambian los filtros o las transacciones base
    useEffect(() => {
        // Solo re-filtra si tenemos transacciones base
        if (transactions.length > 0) {
            console.log("Applying client-side filters due to change in filters or base transactions...");
            const filtered = transactionService.filterTransactions(
                transactions, // Usa la lista completa de la oficina
                'deposit',
                'Pending',   // Filtra por estado y tipo para esta vista específica
                filters      // Aplica los filtros de la UI
            );
            setFilteredTransactions(filtered);
        } else {
             // Si no hay transacciones base, aseguramos que las filtradas también estén vacías
             setFilteredTransactions([]);
        }
    }, [filters, transactions]); // Depende de los filtros y las transacciones base

    // Manejar cambios en los filtros (sin cambios)
    const handleFilterChange = (newFilters: TransactionFilter) => {
        setFilters(newFilters);
    };

    // Resetear filtros (sin cambios)
    const handleResetFilters = () => {
        setFilters({});
    };

    // --- 6. Modifica handlers para pasar el accessToken ---
    const handleTransactionApproved = async (transaction: Transaction, ) => {
         if (sessionStatus !== "authenticated" || !session?.accessToken) {
             toast.error("No estás autenticado o falta el token para aprobar.");
             console.error("Approve failed: Missing session or accessToken.");
             return;
         }
        const accessToken = session.accessToken; // Obtiene el token de la sesión
        try {
            console.log("Iniciando aprobación para transacción:", transaction.id);
             // --- Pasa el accessToken al servicio ---
            const result = await transactionService.approveTransaction(transaction, accessToken);
            console.log("Resultado de approveTransaction:", result);

            if (result.success) {
                toast.success("Transacción aprobada exitosamente");
                console.log("Transacción aprobada. Recargando datos...");
                await fetchTransactions(false); // Recarga sin mostrar loading grande
            } else {
                console.error("ERROR EN LA TRANSACCIÓN:", result.error);
                toast.error(`Error al aprobar: ${result.error || 'Error desconocido'}`);
                // Podrías tener un estado para un modal aquí si prefieres
            }
        } catch (error: unknown) {
            const transactionError = error as TransactionError;
            console.error('Error inesperado al aprobar la transacción:', transactionError);
            toast.error(`Error inesperado: ${transactionError.message || 'Ocurrió un error'}`);
             // Podrías tener un estado para un modal aquí si prefieres
        }
    };

    const handleTransactionRejected = async (rejectedTransaction: Transaction) => {
         if (sessionStatus !== "authenticated" || !session?.accessToken) {
             toast.error("No estás autenticado o falta el token para rechazar.");
             console.error("Reject failed: Missing session or accessToken.");
             return;
         }
         const accessToken = session.accessToken; // Obtiene el token de la sesión
        try {
             // --- Pasa el accessToken al servicio ---
            await transactionService.rejectTransaction(rejectedTransaction, accessToken);
            toast.success("Transacción rechazada");
            console.log('Transacción rechazada. Recargando datos...');
            await fetchTransactions(false); // Recarga sin mostrar loading grande
        } catch (error: unknown) {
            const transactionError = error as TransactionError;
            console.error('Error al rechazar la transacción:', transactionError);
             toast.error(`Error al rechazar: ${transactionError.message || 'Ocurrió un error'}`);
        }
    };

    // --- Renderizado ---
    if (sessionStatus === "loading") {
        // Muestra un skeleton mientras se carga la sesión
        return (
             <div className="container mx-auto p-4">
                 <Card>
                     <CardHeader className="pb-3"><CardTitle>Cargando...</CardTitle></CardHeader>
                     <div className="p-6 pt-3"><TableSkeleton columns={[]} rowCount={5} /></div>
                 </Card>
             </div>
        );
    }

    if (sessionStatus === "unauthenticated") {
        // Puedes redirigir al login o mostrar un mensaje
        return <div className="container mx-auto p-4">Necesitas iniciar sesión.</div>;
    }

    // Renderizado principal (cuando está autenticado)
    return (
        <div className="container mx-auto p-4">
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-2xl font-bold">Depósitos Pendientes</CardTitle>
                    <CardDescription>
                         Gestione los depósitos que requieren aprobación (Oficina: {session?.user?.officeId || 'N/A'})
                    </CardDescription>
                </CardHeader>

                <div className="p-6 pt-3">
                    <TransactionFilters
                        onChange={handleFilterChange}
                        onReset={handleResetFilters}
                        // Podrías pasar aquí una lista de oficinas si tuvieras un rol admin
                    />

                     {/* Mostrar skeleton mientras cargan los datos iniciales, incluso si la sesión ya cargó */}
                     {isLoading && transactions.length === 0 ? (
                         <TableSkeleton columns={[]} rowCount={5} />
                     ) : error ? (
                         <Card className="p-8 text-center">
                             <p className="text-red-500">{error}</p>
                         </Card>
                     ) : (
                         <TransactionTable
                             // Pasa las transacciones filtradas localmente
                             transactions={filteredTransactions}
                             showApproveButton={true}
                             onTransactionApproved={handleTransactionApproved}
                             onTransactionRejected={handleTransactionRejected}
                             // Indicador visual para recargas en segundo plano
                             isRefreshing={isLoading && transactions.length > 0}
                         />
                     )}
                </div>
            </Card>
        </div>
    );
}