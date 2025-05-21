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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ArrowUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { useAllUsers, UserFilters, User } from "../hooks/use-all-users";
import { Pagination } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Mapa de colores para los diferentes estados
const statusColors: Record<string, string> = {
    'active': 'bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/30',
    'inactive': 'bg-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-500/30',
    'suspended': 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/30',
};

// Mapa de colores para los diferentes roles
const roleColors: Record<string, string> = {
    'admin': 'bg-purple-500/20 text-purple-700 dark:text-purple-400 hover:bg-purple-500/30',
    'operador': 'bg-blue-500/20 text-blue-700 dark:text-blue-400 hover:bg-blue-500/30',
    'encargado': 'bg-teal-500/20 text-teal-700 dark:text-teal-400 hover:bg-teal-500/30',
    'superadmin': 'bg-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-500/30',
};

interface UsersListProps {
    filters: UserFilters;
}

export default function UsersList({ filters }: UsersListProps) {
    // Usar el hook personalizado para obtener usuarios con filtros
    const { filteredUsers, isLoading, error, refetch } = useAllUsers(filters);

    // Estados para paginación
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Estado para ordenación
    const [sortConfig, setSortConfig] = useState<{
        key: keyof User;
        direction: 'asc' | 'desc';
    } | null>(null);

    // Función para ordenar usuarios
    const sortedUsers = useMemo(() => {
        return [...filteredUsers].sort((a, b) => {
            if (!sortConfig) return 0;

            const { key, direction } = sortConfig;
            let aValue = a[key];
            let bValue = b[key];

            // Manejar fechas
            if ((key === 'createdAt' || key === 'lastLoginDate') && aValue && bValue) {
                aValue = new Date(aValue).getTime();
                bValue = new Date(bValue).getTime();
            }

            // Comparación
            if (aValue < bValue) return direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredUsers, sortConfig]);

    // Calcular usuarios paginados
    const currentUsers = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedUsers.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedUsers, currentPage, itemsPerPage]);

    // Calcular el número total de páginas
    const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);

    // Función para cambiar el criterio de ordenación
    const handleSort = (key: keyof User) => {
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

    // Si no hay usuarios, mostrar mensaje
    if (sortedUsers.length === 0) {
        return (
            <div className="p-4 text-center text-muted-foreground">
                No se encontraron usuarios con los filtros aplicados.
            </div>
        );
    }

    // Renderizar tabla con usuarios
    return (
        <div className="space-y-4">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort('username')}>
                                    Nombre <ArrowUpDown className="ml-1 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort('email')}>
                                    Email <ArrowUpDown className="ml-1 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort('role')}>
                                    Rol <ArrowUpDown className="ml-1 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort('status')}>
                                    Estado <ArrowUpDown className="ml-1 h-4 w-4" />
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
                        {currentUsers.map((user) => (
                            <TableRow key={user.id.toString()}>
                                <TableCell className="font-medium">{user.username}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Badge className={roleColors[user.role] || ''}>
                                        {user.role}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge className={statusColors[user.status] || ''}>
                                        {user.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>{user.office}</TableCell>
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
                                            {user.status === 'active' ? (
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

            {/* Control de paginación */}
            <div className="flex flex-col sm:flex-row items-center justify-between">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4 sm:mb-0">
                    <div>Mostrando {Math.min(sortedUsers.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(sortedUsers.length, currentPage * itemsPerPage)} de {sortedUsers.length} usuarios</div>
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
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
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