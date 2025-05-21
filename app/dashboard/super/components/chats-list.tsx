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
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTimeAgo } from "@/lib/utils";
import { useAllChats, ChatFilters, Conversation } from "../hooks/use-all-chats";

// Mapa de colores para los diferentes estados
const statusColors: Record<string, string> = {
    'active': 'bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/30',
    'closed': 'bg-gray-500/20 text-gray-700 dark:text-gray-400 hover:bg-gray-500/30',
};

interface ChatsListProps {
    filters: ChatFilters;
}

export default function ChatsList({ filters }: ChatsListProps) {
    // Usar el hook personalizado para obtener conversaciones con filtros
    const { filteredConversations, isLoading, error } = useAllChats(filters);

    // Estado para ordenación
    const [sortConfig, setSortConfig] = useState<{
        key: keyof Conversation;
        direction: 'asc' | 'desc';
    } | null>(null);

    // Función para ordenar conversaciones
    const sortedConversations = [...filteredConversations].sort((a, b) => {
        if (!sortConfig) return 0;

        const { key, direction } = sortConfig;
        const aValue = a[key];
        const bValue = b[key];

        // Si ambos valores son undefined, considerarlos iguales
        if (aValue === undefined && bValue === undefined) return 0;

        // Si solo aValue es undefined, considerarlo menor
        if (aValue === undefined) return direction === 'asc' ? -1 : 1;

        // Si solo bValue es undefined, considerarlo menor
        if (bValue === undefined) return direction === 'asc' ? 1 : -1;

        // Manejar fechas - usar variables temporales para almacenar los timestamps
        if ((key === 'createdAt' || key === 'updatedAt') && aValue && bValue) {
            const aTime = new Date(aValue).getTime();
            const bTime = new Date(bValue).getTime();
            return direction === 'asc' ? aTime - bTime : bTime - aTime;
        }

        // Comparación para otros tipos de valores
        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Función para cambiar el criterio de ordenación
    const handleSort = (key: keyof Conversation) => {
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

    // Si no hay conversaciones, mostrar mensaje
    if (sortedConversations.length === 0) {
        return (
            <div className="p-4 text-center text-muted-foreground">
                No se encontraron conversaciones con los filtros aplicados.
            </div>
        );
    }

    // Función para obtener la última actividad
    const getLastActivity = (conversation: Conversation) => {
        if (conversation.updatedAt) {
            return formatTimeAgo(new Date(conversation.updatedAt));
        }
        return "Desconocido";
    };

    // Renderizar tabla con conversaciones
    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>
                            <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort('title')}>
                                Título <ArrowUpDown className="ml-1 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead>Usuario</TableHead>
                        <TableHead>
                            <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort('officeId')}>
                                Oficina <ArrowUpDown className="ml-1 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead>
                            <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort('status')}>
                                Estado <ArrowUpDown className="ml-1 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead>
                            <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort('updatedAt')}>
                                Última actividad <ArrowUpDown className="ml-1 h-4 w-4" />
                            </Button>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedConversations.map((conversation) => (
                        <TableRow key={conversation.id.toString()}>
                            <TableCell className="font-medium">
                                {conversation.title || `Conversación #${conversation.id.substring(0, 8)}`}
                            </TableCell>
                            <TableCell>
                                {conversation.initiatingUser ? (
                                    <div className="flex flex-col">
                                        <span>{conversation.initiatingUser.username}</span>
                                        <span className="text-xs text-muted-foreground">{conversation.initiatingUser.email}</span>
                                    </div>
                                ) : (
                                    "Usuario desconocido"
                                )}
                            </TableCell>
                            <TableCell>{conversation.officeId || "N/A"}</TableCell>
                            <TableCell>
                                <Badge className={statusColors[conversation.status] || ''}>
                                    {conversation.status === 'active' ? 'Activo' : 'Cerrado'}
                                </Badge>
                            </TableCell>
                            <TableCell>{getLastActivity(conversation)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
} 