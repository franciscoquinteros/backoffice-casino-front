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
import { useAllUsers, User, UserFilters } from "../hooks/use-all-users";
import { Pagination } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EditUserModal } from "@/components/users/edit-user-modal";
import type { User as EditModalUserType } from "@/types/user";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

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

// Define SortableUserFields based on the User type from the hook
type SortableUserFields = keyof Pick<User, 'username' | 'email' | 'role' | 'status' | 'office' | 'createdAt' | 'lastLoginDate'>;

interface UsersListProps {
    filters: UserFilters; // Use UserFilters from the hook
}

export default function UsersList({ filters }: UsersListProps) {
    const { data: session } = useSession();
    const {
        filteredUsers,
        isLoading,
        error,
        refetch: fetchAllUsers
    } = useAllUsers(filters);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState<{
        key: SortableUserFields;
        direction: 'asc' | 'desc';
    } | null>(null);

    const [selectedUser, setSelectedUser] = useState<User | null>(null); // Use User from hook
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isEditLoading, setIsEditLoading] = useState(false);

    // Función para ordenar usuarios based on filteredUsers from the hook
    const sortedAndPagedUsers = useMemo(() => {
        const usersToProcess = [...filteredUsers];

        if (sortConfig) {
            usersToProcess.sort((a, b) => {
                const { key, direction } = sortConfig;
                // a and b are already of type User from the hook
                const aValue = a[key];
                const bValue = b[key];

                if ((aValue === undefined || aValue === null) &&
                    (bValue === undefined || bValue === null)) return 0;
                if (aValue === undefined || aValue === null) return direction === 'asc' ? -1 : 1;
                if (bValue === undefined || bValue === null) return direction === 'asc' ? 1 : -1;

                if ((key === 'createdAt' || key === 'lastLoginDate') && aValue && bValue) {
                    const isValidDateValue = (val: unknown): val is string | number | Date =>
                        typeof val === 'string' || typeof val === 'number' || val instanceof Date;
                    if (isValidDateValue(aValue) && isValidDateValue(bValue)) {
                        const aTime = new Date(aValue).getTime();
                        const bTime = new Date(bValue).getTime();
                        return direction === 'asc' ? aTime - bTime : bTime - aTime;
                    }
                }
                if (typeof aValue === 'object' && aValue !== null && typeof bValue === 'object' && bValue !== null) {
                    const aStr = JSON.stringify(aValue);
                    const bStr = JSON.stringify(bValue);
                    return direction === 'asc'
                        ? aStr.localeCompare(bStr)
                        : bStr.localeCompare(aStr);
                }
                if (typeof aValue === typeof bValue) {
                    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
                    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
                    return 0;
                }
                const aStr = String(aValue);
                const bStr = String(bValue);
                return direction === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
            });
        }
        return usersToProcess;
    }, [filteredUsers, sortConfig]);

    // Calcular usuarios paginados from the sorted list
    const currentUsers = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedAndPagedUsers.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedAndPagedUsers, currentPage, itemsPerPage]);

    // Calcular el número total de páginas
    const totalPages = Math.ceil(sortedAndPagedUsers.length / itemsPerPage);

    // Función para cambiar el criterio de ordenación
    const handleSort = (key: SortableUserFields) => {
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

    // Función para abrir el modal de edición
    const handleEditUser = (user: User) => { // User from hook
        setSelectedUser(user);
        setIsEditModalOpen(true);
    };

    // Función para guardar los cambios del usuario
    const handleSaveUser = async (updatedUserDataFromModal: Partial<EditModalUserType> & { isActive?: boolean }) => {
        if (!selectedUser || !session?.accessToken) {
            toast.error("Error: Usuario no seleccionado o sesión no válida.");
            setIsEditLoading(false);
            return;
        }

        setIsEditLoading(true);
        try {
            // Adapt updatedUserDataFromModal (from EditUserModal) to what the API expects (hook's User type)
            // This is important if EditUserModal sends a structure different from the hook's User type
            const payload: Partial<User> & { isActive?: boolean } = {
                ...selectedUser, // Start with the full selectedUser (hook type)
            };

            if (updatedUserDataFromModal.isActive !== undefined) {
                payload.status = updatedUserDataFromModal.isActive ? 'active' : 'inactive';
                // Remove isActive as it's not part of the hook's User type or backend PATCH payload directly
            }
            if (updatedUserDataFromModal.role !== undefined) {
                payload.role = updatedUserDataFromModal.role;
            }
            if (updatedUserDataFromModal.office !== undefined) {
                // The modal sends office as string, hook expects string. If modal could send number, convert here.
                payload.office = String(updatedUserDataFromModal.office);
            }
            if (updatedUserDataFromModal.withdrawal !== undefined) {
                payload.withdrawal = updatedUserDataFromModal.withdrawal;
            }
            // Any other fields from EditModalUserType that need to be mapped to User (hook type) for the PATCH request

            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/users/${selectedUser.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json',
                },
                // Send only the fields that are actually part of the hook's User type and are meant to be updated
                body: JSON.stringify({
                    status: payload.status,
                    role: payload.role,
                    office: payload.office,
                    withdrawal: payload.withdrawal,
                    // Add other updatable fields from 'User' (hook type) as needed
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Error ${response.status}: ${response.statusText}` }));
                throw new Error(errorData.message || `Error al actualizar el usuario: ${response.status}`);
            }

            toast.success("Usuario actualizado correctamente.");
            if (fetchAllUsers) {
                await fetchAllUsers();
            }
            setIsEditModalOpen(false);
            setSelectedUser(null);
        } catch (err) {
            console.error("Error al guardar usuario:", err);
            toast.error(err instanceof Error ? err.message : "No se pudo actualizar el usuario.");
        } finally {
            setIsEditLoading(false);
        }
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
    if (filteredUsers.length === 0 && !isLoading) {
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
                                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                                Editar
                                            </DropdownMenuItem>
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
                    <div>Mostrando {Math.min(sortedAndPagedUsers.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(sortedAndPagedUsers.length, currentPage * itemsPerPage)} de {sortedAndPagedUsers.length} usuarios</div>
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

            {/* Modal de edición */}
            {selectedUser && (
                <EditUserModal
                    user={{
                        // Adapt selectedUser (hook User type) to EditModalUserType
                        id: String(selectedUser.id), // Ensure id is string
                        username: selectedUser.username,
                        email: selectedUser.email,
                        name: selectedUser.username, // Use username as name, or derive if firstName/lastName available
                        role: selectedUser.role,
                        office: selectedUser.office, // Hook's office is string, EditModalUserType is string | number. This is fine.
                        status: selectedUser.status,
                        // Ensure withdrawal is 'enabled' or 'disabled' if present, or modal handles undefined
                        withdrawal: selectedUser.withdrawal === 'enabled' || selectedUser.withdrawal === 'disabled'
                            ? selectedUser.withdrawal
                            : 'disabled', // Default if undefined or other value
                        createdAt: new Date(selectedUser.createdAt || Date.now()), // Ensure it's a Date object
                        // Add any other fields EditModalUserType expects
                    }}
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedUser(null);
                    }}
                    onSave={handleSaveUser}
                    isLoading={isEditLoading}
                />
            )}
        </div>
    );
}