"use client";

import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ArrowUpDown, Copy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { useAllAccounts, AccountFilters, Account } from "../hooks/use-all-accounts";
import { toast } from "sonner";

// Mapa de colores para los diferentes estados
const statusColors: Record<string, string> = {
    'active': 'bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/30',
    'disabled': 'bg-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-500/30',
    'suspended': 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/30',
    'pending': 'bg-blue-500/20 text-blue-700 dark:text-blue-400 hover:bg-blue-500/30',
};

interface AccountsListProps {
    filters: AccountFilters;
}

export default function AccountsList({ filters }: AccountsListProps) {
    // Usar el hook personalizado para obtener cuentas con filtros
    const { filteredAccounts, isLoading, error } = useAllAccounts(filters);

    // Estado para ordenación
    const [sortConfig, setSortConfig] = useState<{
        key: keyof Account;
        direction: 'asc' | 'desc';
    } | null>(null);

    // Función para ordenar cuentas
    const sortedAccounts = [...filteredAccounts].sort((a, b) => {
        if (!sortConfig) return 0;

        const { key, direction } = sortConfig;
        let aValue = a[key];
        let bValue = b[key];

        // Manejar fechas
        if (key === 'createdAt' && aValue && bValue) {
            aValue = new Date(aValue).getTime();
            bValue = new Date(bValue).getTime();
        }

        // Manejar números
        if (key === 'accumulatedAmount' && aValue !== undefined && bValue !== undefined) {
            aValue = Number(aValue);
            bValue = Number(bValue);
        }

        // Si ambos valores son undefined, considerarlos iguales
        if (aValue === undefined && bValue === undefined) return 0;

        // Si solo aValue es undefined, considerarlo menor
        if (aValue === undefined) return direction === 'asc' ? -1 : 1;

        // Si solo bValue es undefined, considerarlo menor
        if (bValue === undefined) return direction === 'asc' ? 1 : -1;

        // Ahora sabemos que ambos valores están definidos
        // Comparación segura
        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Función para cambiar el criterio de ordenación
    const handleSort = (key: keyof Account) => {
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

    // Función para copiar al portapapeles
    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text).then(() => {
            toast.success(`${label} copiado al portapapeles`);
        });
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

    // Si no hay cuentas, mostrar mensaje
    if (sortedAccounts.length === 0) {
        return (
            <div className="p-4 text-center text-muted-foreground">
                No se encontraron cuentas con los filtros aplicados.
            </div>
        );
    }

    // Renderizar tabla con cuentas
    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>
                            <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort('name')}>
                                Nombre <ArrowUpDown className="ml-1 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead>
                            <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort('office')}>
                                Oficina <ArrowUpDown className="ml-1 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead>CBU/Alias</TableHead>
                        <TableHead>
                            <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort('status')}>
                                Estado <ArrowUpDown className="ml-1 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead>
                            <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort('operator')}>
                                Operador <ArrowUpDown className="ml-1 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead>
                            <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort('accumulatedAmount')}>
                                Monto Acumulado <ArrowUpDown className="ml-1 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedAccounts.map((account) => (
                        <TableRow key={account.id.toString()}>
                            <TableCell className="font-medium">{account.name}</TableCell>
                            <TableCell>{account.office}</TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <div className="flex items-center">
                                        <span className="text-sm font-medium">CBU: </span>
                                        <span className="ml-2 text-sm truncate max-w-[120px]">{account.cbu}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 ml-1"
                                            onClick={() => copyToClipboard(account.cbu, 'CBU')}
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="text-sm font-medium">Alias: </span>
                                        <span className="ml-2 text-sm truncate max-w-[120px]">{account.alias}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 ml-1"
                                            onClick={() => copyToClipboard(account.alias, 'Alias')}
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge className={statusColors[account.status] || ''}>
                                    {account.status}
                                </Badge>
                            </TableCell>
                            <TableCell>{account.operator}</TableCell>
                            <TableCell>{account.accumulatedAmount !== undefined ? formatCurrency(account.accumulatedAmount) : 'N/A'}</TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Acciones</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem>Ver detalles</DropdownMenuItem>
                                        <DropdownMenuItem>Editar</DropdownMenuItem>
                                        <DropdownMenuItem>Ver transacciones</DropdownMenuItem>
                                        {account.status === 'active' ? (
                                            <DropdownMenuItem>Desactivar</DropdownMenuItem>
                                        ) : (
                                            <DropdownMenuItem>Activar</DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
} 