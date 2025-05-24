"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { useAllTransactions, TransactionFilters, Transaction } from "../hooks/use-all-transactions";
import { Pagination } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { transactionService } from "@/components/transaction-service";
import { useAllAccounts } from '../hooks/use-all-accounts';

// Mapa de colores para los diferentes estados
const statusColors: Record<string, string> = {
    'Pending': 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/30',
    'Match MP': 'bg-blue-500/20 text-blue-700 dark:text-blue-400 hover:bg-blue-500/30',
    'Aceptado': 'bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/30',
    'Rechazado': 'bg-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-500/30',
    'Completado': 'bg-blue-500/20 text-blue-700 dark:text-blue-400 hover:bg-blue-500/30',
    'Cancelado': 'bg-gray-500/20 text-gray-700 dark:text-gray-400 hover:bg-gray-500/30',
    'Error': 'bg-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-500/30',
};

interface TransactionsListProps {
    filters: TransactionFilters;
}

export default function TransactionsList({ filters }: TransactionsListProps) {
    // Usar el hook personalizado para obtener transacciones con filtros
    const { filteredTransactions, isLoading, error, refetch } = useAllTransactions(filters);
    const { data: session, status: sessionStatus } = useSession();
    const { allAccounts } = useAllAccounts();

    // Estado para el ID de la transacción en proceso de aprobación/rechazo
    const [processingId, setProcessingId] = useState<string | number | null>(null);

    // Estados para paginación
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);

    // Estado para ordenación
    const [sortConfig, setSortConfig] = useState<{
        key: keyof Transaction;
        direction: 'asc' | 'desc';
    } | null>(null);

    // Función para ordenar transacciones
    const sortedTransactions = useMemo(() => {
        return [...filteredTransactions].sort((a, b) => {
            if (!sortConfig) return 0;

            const { key, direction } = sortConfig;
            const aValue = a[key];
            const bValue = b[key];

            // Si ambos valores son undefined o null, considerarlos iguales
            if ((aValue === undefined || aValue === null) &&
                (bValue === undefined || bValue === null)) return 0;

            // Si solo aValue es undefined o null, considerarlo menor
            if (aValue === undefined || aValue === null) return direction === 'asc' ? -1 : 1;

            // Si solo bValue es undefined o null, considerarlo menor
            if (bValue === undefined || bValue === null) return direction === 'asc' ? 1 : -1;

            // Manejar fechas
            if (key === 'date_created' && aValue && bValue) {
                // Verificar que los valores sean compatibles con Date
                const isValidDateValue = (val: unknown): val is string | number | Date =>
                    typeof val === 'string' || typeof val === 'number' || val instanceof Date;

                // Solo procesar si ambos valores son compatibles con Date
                if (isValidDateValue(aValue) && isValidDateValue(bValue)) {
                    const aTime = new Date(aValue).getTime();
                    const bTime = new Date(bValue).getTime();
                    return direction === 'asc' ? aTime - bTime : bTime - aTime;
                }
            }

            // Manejar objetos complejos (como PayerIdentification)
            if (typeof aValue === 'object' && aValue !== null && typeof bValue === 'object' && bValue !== null) {
                // Si son objetos, usamos JSON.stringify para comparar
                const aStr = JSON.stringify(aValue);
                const bStr = JSON.stringify(bValue);
                return direction === 'asc'
                    ? aStr.localeCompare(bStr)
                    : bStr.localeCompare(aStr);
            }

            // Para tipos simples (string, number, boolean)
            if (typeof aValue === typeof bValue) {
                if (aValue < bValue) return direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return direction === 'asc' ? 1 : -1;
                return 0;
            }

            // Si los tipos son diferentes, convertir a string para comparar
            const aStr = String(aValue);
            const bStr = String(bValue);
            return direction === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
        });
    }, [filteredTransactions, sortConfig]);

    // Calcular transacciones paginadas
    const paginatedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedTransactions.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedTransactions, currentPage, itemsPerPage]);

    // Calcular el número total de páginas
    const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);

    // Función para cambiar el criterio de ordenación
    const handleSort = (key: keyof Transaction) => {
        setSortConfig(prevSort => {
            if (!prevSort || prevSort.key !== key) {
                return { key, direction: 'asc' };
            }

            if (prevSort.direction === 'asc') {
                return { key, direction: 'desc' };
            }

            return null; // Quita el ordenamiento
        });
    };

    // Función para cambiar la página
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    // Función para cambiar el número de elementos por página
    const handleItemsPerPageChange = (value: string) => {
        setItemsPerPage(Number(value));
        setCurrentPage(1); // Resetear a la primera página
    };

    // Función para aprobar una transacción
    const handleApprove = async (transaction: Transaction) => {
        if (sessionStatus !== "authenticated" || !session?.accessToken) {
            toast.error("No estás autenticado o falta el token para aprobar.");
            return;
        }

        setProcessingId(transaction.id);

        try {
            // Convertir el tipo de payer_identification si es necesario
            const payerIdentification = transaction.payer_identification
                ? (typeof transaction.payer_identification === 'string'
                    ? { type: 'DNI', number: transaction.payer_identification }
                    : transaction.payer_identification)
                : undefined;

            // Asegurar que la transacción tenga una fecha de creación válida
            const processedTransaction = {
                ...transaction,
                // date_created nunca debe ser undefined sino una cadena de texto
                date_created: transaction.date_created ||
                    (typeof transaction.dateCreated === 'string' ? transaction.dateCreated :
                        transaction.dateCreated instanceof Date ? transaction.dateCreated.toISOString() :
                            new Date().toISOString()),
                // Reemplazar payer_identification con el formato correcto
                payer_identification: payerIdentification
            };

            const result = await transactionService.approveTransaction(processedTransaction, session.accessToken);

            if (result.success) {
                toast.success("Transacción aprobada exitosamente");
                await refetch();
            } else {
                toast.error(`Error al aprobar: ${result.error || 'Error desconocido'}`);
            }
        } catch (error) {
            console.error('Error al aprobar la transacción:', error);
            toast.error(`Error inesperado: ${error instanceof Error ? error.message : 'Ocurrió un error'}`);
        } finally {
            setProcessingId(null);
        }
    };

    // Función para rechazar una transacción
    const handleReject = async (transaction: Transaction) => {
        if (sessionStatus !== "authenticated" || !session?.accessToken) {
            toast.error("No estás autenticado o falta el token para rechazar.");
            return;
        }

        setProcessingId(transaction.id);

        try {
            // Convertir el tipo de payer_identification si es necesario
            const payerIdentification = transaction.payer_identification
                ? (typeof transaction.payer_identification === 'string'
                    ? { type: 'DNI', number: transaction.payer_identification }
                    : transaction.payer_identification)
                : undefined;

            // Asegurar que la transacción tenga una fecha de creación válida
            const processedTransaction = {
                ...transaction,
                // date_created nunca debe ser undefined sino una cadena de texto
                date_created: transaction.date_created ||
                    (typeof transaction.dateCreated === 'string' ? transaction.dateCreated :
                        transaction.dateCreated instanceof Date ? transaction.dateCreated.toISOString() :
                            new Date().toISOString()),
                // Reemplazar payer_identification con el formato correcto
                payer_identification: payerIdentification
            };

            await transactionService.rejectTransaction(processedTransaction, session.accessToken);
            toast.success("Transacción rechazada exitosamente");
            await refetch();
        } catch (error) {
            console.error('Error al rechazar la transacción:', error);
            toast.error(`Error al rechazar: ${error instanceof Error ? error.message : 'Ocurrió un error'}`);
        } finally {
            setProcessingId(null);
        }
    };

    // Función para obtener la fecha de transacción
    const getTransactionDate = (transaction: Transaction): string => {
        // Usar un tipo de índice para campos adicionales
        type TransactionWithDates = Transaction & {
            createdAt?: string;
            created_at?: string;
            updatedAt?: string;
            updated_at?: string;
        };

        const txWithDates = transaction as TransactionWithDates;

        const dateValue = transaction.date_created ||
            txWithDates.createdAt ||
            txWithDates.created_at ||
            txWithDates.updatedAt ||
            txWithDates.updated_at ||
            null;

        // Verificar si la fecha es válida antes de formatearla
        if (dateValue) {
            try {
                const date = new Date(dateValue);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleString('es-AR');
                }
            } catch (e) {
                console.error('Error al procesar fecha:', e);
            }
        }

        return 'No disponible';
    };

    // Función para obtener la cuenta de la transacción (igual que en depósitos)
    const getTransactionAccount = (transaction: Transaction): string => {
        // Si es una transacción Bank Transfer, devolver cadena vacía
        if (transaction.description === 'Bank Transfer') {
            return ''; // Campo vacío para Bank Transfer
        }

        // Crear un tipo extendido para campos adicionales
        type ExtendedTransaction = Transaction & {
            account_number?: string;
            account?: string;
        };

        const extendedTx = transaction as ExtendedTransaction;

        // Intentar múltiples posibles campos donde puede estar la información de cuenta
        return transaction.payer_email ||
            transaction.walletAddress ||
            transaction.cbu ||
            extendedTx.account_number ||
            extendedTx.account ||
            'No disponible';
    };

    // Función para obtener el nombre de cuenta (igual que en Depositos Directos, usando receiver_id)
    const getAccountNameDisplay = (transaction: Transaction): string => {
        // Si ya tiene transaction_account_name válido, usarlo
        if (transaction.transaction_account_name && transaction.transaction_account_name !== 'No disponible') {
            return transaction.transaction_account_name;
        }
        // Si tiene account_name válido, usarlo como fallback
        if (transaction.account_name && transaction.account_name !== 'No disponible') {
            return transaction.account_name;
        }
        // Buscar por receiver_id en las cuentas
        if (transaction.receiver_id) {
            const found = allAccounts.find(acc => acc.receiver_id === transaction.receiver_id);
            if (found && found.name) {
                return found.name;
            }
        }
        // Fallbacks
        if (transaction.account_holder) {
            return transaction.account_holder;
        }
        return 'No disponible';
    };

    // Función para exportar transacciones a CSV
    const handleExport = useCallback(async () => {
        try {
            // Usamos setTimeout y Promise para evitar bloquear el hilo principal
            await new Promise(resolve => setTimeout(resolve, 0));

            // Crear encabezados para el CSV
            const headers = [
                'Tipo',
                'Monto',
                'Estado',
                'Fecha',
                'Oficina',
                'CBU/Cuenta',
                'Nombre Cuenta'
            ];

            // Procesamiento por lotes para evitar bloqueos en grandes conjuntos de datos
            const batchSize = 100;
            let rows: Array<Array<string | number | undefined>> = [];

            // Procesar en pequeños lotes (usar paginatedTransactions para exportar solo lo visible)
            for (let i = 0; i < paginatedTransactions.length; i += batchSize) {
                const batch = paginatedTransactions.slice(i, i + batchSize);

                // Permitir que el navegador respire entre lotes
                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }

                const batchRows = batch.map(transaction => {
                    return [
                        transaction.type === 'deposit' ? 'Depósito' : 'Retiro',
                        transaction.amount,
                        transaction.status,
                        getTransactionDate(transaction),
                        transaction.office || 'N/A',
                        getTransactionAccount(transaction),
                        getAccountNameDisplay(transaction)
                    ];
                });

                rows = [...rows, ...batchRows];
            }

            // Combinar encabezados y filas
            const csvContent = [
                headers.join(','),
                ...rows.map(row =>
                    row.map((cell: string | number | undefined) =>
                        `"${String(cell || '').replace(/"/g, '""')}"`
                    ).join(',')
                )
            ].join('\n');

            // Otra pequeña pausa antes de crear el blob
            await new Promise(resolve => setTimeout(resolve, 0));

            // Crear un Blob y generar URL
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);

            // Crear enlace y descargar
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `transacciones_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();

            // Limpiar, pero con un pequeño retraso para asegurar que se complete la descarga
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);

            toast.success('Transacciones exportadas correctamente');

        } catch (error) {
            console.error("Error al exportar transacciones:", error);
            toast.error('Error al exportar transacciones');
        }
    }, [paginatedTransactions]);

    // Tipo extendido para filtros que incluye propiedades adicionales de control
    type ExtendedTransactionFilters = TransactionFilters & {
        _export?: number;
        _refresh?: number;
    };

    // useEffect para detectar cuando se solicita exportar desde el dashboard
    useEffect(() => {
        const extendedFilters = filters as ExtendedTransactionFilters;
        if (extendedFilters._export) {
            handleExport();
        }
    }, [filters, handleExport]);

    // useEffect para detectar cuando se solicita refresh desde el dashboard
    useEffect(() => {
        const extendedFilters = filters as ExtendedTransactionFilters;
        if (extendedFilters._refresh) {
            refetch();
        }
    }, [filters, refetch]);

    // Auto-refresh cada 5 segundos
    useEffect(() => {
        const interval = setInterval(() => {
            refetch();
        }, 5000);
        return () => clearInterval(interval);
    }, [refetch]);

    // Si está cargando, mostrar skeleton
    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                ))}
            </div>
        );
    }

    // Si hay un error, mostrarlo
    if (error) {
        return (
            <div className="p-4 border border-red-300 rounded-md bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800">
                {error}
            </div>
        );
    }

    // Si no hay transacciones, mostrar mensaje
    if (sortedTransactions.length === 0) {
        return (
            <div className="p-4 text-center text-muted-foreground">
                No se encontraron transacciones con los filtros aplicados.
            </div>
        );
    }

    // Renderizar tabla con transacciones
    return (
        <div className="space-y-4">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort('type')}>
                                    Tipo <ArrowUpDown className="ml-1 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort('amount')}>
                                    Monto <ArrowUpDown className="ml-1 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort('status')}>
                                    Estado <ArrowUpDown className="ml-1 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort('date_created')}>
                                    Fecha <ArrowUpDown className="ml-1 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort('office')}>
                                    Oficina <ArrowUpDown className="ml-1 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead>CBU/Cuenta</TableHead>
                            <TableHead>Nombre Cuenta</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedTransactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                                <TableCell>
                                    <Badge variant={transaction.type === 'deposit' ? 'default' : 'secondary'}>
                                        {transaction.type === 'deposit' ? 'Depósito' : 'Retiro'}
                                    </Badge>
                                </TableCell>
                                <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                                <TableCell>
                                    <Badge className={statusColors[transaction.status] || ''}>
                                        {transaction.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>{getTransactionDate(transaction)}</TableCell>
                                <TableCell>{transaction.office || 'N/A'}</TableCell>
                                <TableCell>{getTransactionAccount(transaction)}</TableCell>
                                <TableCell>{getAccountNameDisplay(transaction)}</TableCell>
                                <TableCell className="text-right">
                                    {transaction.status === 'Pending' ? (
                                        // Solo mostrar botones de aprobar/rechazar para depósitos externos (no IPN ni Bank Transfer)
                                        transaction.description !== 'Pago recibido vía IPN - Pendiente de validación' && transaction.description !== 'Bank Transfer' ? (
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex items-center gap-1 bg-green-500/10 text-green-700 dark:text-green-500 hover:bg-green-500/20"
                                                    onClick={() => handleApprove(transaction)}
                                                    disabled={processingId === transaction.id}
                                                >
                                                    {processingId === transaction.id ? (
                                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                    ) : (
                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                    )}
                                                    Aprobar
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex items-center gap-1 bg-red-500/10 text-red-700 dark:text-red-500 hover:bg-red-500/20"
                                                    onClick={() => handleReject(transaction)}
                                                    disabled={processingId === transaction.id}
                                                >
                                                    {processingId === transaction.id ? (
                                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                    ) : (
                                                        <XCircle className="h-3 w-3 mr-1" />
                                                    )}
                                                    Rechazar
                                                </Button>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">
                                                {transaction.description === 'Bank Transfer' ? 'Sin acciones' : 'IPN - Sin acciones'}
                                            </span>
                                        )
                                    ) : (
                                        <span className="text-sm text-muted-foreground">
                                            {transaction.status === 'Aceptado' ? 'Aprobada' :
                                                transaction.status === 'Rechazado' ? 'Rechazada' : transaction.status}
                                        </span>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Control de paginación */}
            <div className="flex flex-col sm:flex-row items-center justify-between">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4 sm:mb-0">
                    <div>Mostrando {Math.min(sortedTransactions.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(sortedTransactions.length, currentPage * itemsPerPage)} de {sortedTransactions.length} transacciones</div>
                    <div className="flex items-center space-x-2">
                        <span>Mostrar</span>
                        <Select
                            value={itemsPerPage.toString()}
                            onValueChange={handleItemsPerPageChange}
                        >
                            <SelectTrigger className="w-[70px]">
                                <SelectValue placeholder={itemsPerPage.toString()} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>
                        <span>por página</span>
                    </div>
                </div>

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            </div>
        </div>
    );
} 