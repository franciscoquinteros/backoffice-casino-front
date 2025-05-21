"use client";

import { useState, useMemo } from "react";
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
            let aValue = a[key];
            let bValue = b[key];

            // Si ambos valores son undefined o null, considerarlos iguales
            if ((aValue === undefined || aValue === null) &&
                (bValue === undefined || bValue === null)) return 0;

            // Si solo aValue es undefined o null, considerarlo menor
            if (aValue === undefined || aValue === null) return direction === 'asc' ? -1 : 1;

            // Si solo bValue es undefined o null, considerarlo menor
            if (bValue === undefined || bValue === null) return direction === 'asc' ? 1 : -1;

            // Manejar fechas
            if (key === 'date_created' && aValue && bValue) {
                // Crear variables temporales para los timestamps
                const aTime = new Date(aValue).getTime();
                const bTime = new Date(bValue).getTime();
                return direction === 'asc' ? aTime - bTime : bTime - aTime;
            }

            // Ya sabemos que ambos valores están definidos, podemos comparar con seguridad
            if (aValue < bValue) return direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return direction === 'asc' ? 1 : -1;
            return 0;
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
            const result = await transactionService.approveTransaction(transaction, session.accessToken);

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
            await transactionService.rejectTransaction(transaction, session.accessToken);
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
                            <TableHead className="w-[100px]">
                                <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort('id')}>
                                    ID <ArrowUpDown className="ml-1 h-4 w-4" />
                                </Button>
                            </TableHead>
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
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedTransactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                                <TableCell className="font-medium">{transaction.id.toString().slice(0, 8)}...</TableCell>
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
                                <TableCell className="text-right">
                                    {transaction.status === 'Pending' ? (
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