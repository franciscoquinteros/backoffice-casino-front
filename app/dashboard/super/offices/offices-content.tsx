"use client";

import { useState, useEffect } from "react";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { TableSkeleton, type ColumnConfig } from '@/components/ui/table-skeleton';
import { SkeletonLoader } from "@/components/skeleton-loader";
import { useOffices, Office } from "@/components/hooks/use-offices";
import { CreateOfficeModal } from "../../office-configuration/create-office-modal";
import { EditOfficeModal } from "../../office-configuration/edit-office-modal";
import { DeleteOfficeModal } from "../../office-configuration/delete-office-modal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function OfficesContent() {
    // Utilizamos el hook useOffices para obtener los datos
    const { offices, isLoading, error, refreshOffices } = useOffices();

    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [currentOffice, setCurrentOffice] = useState<Office | null>(null);
    // Estado para controlar qué menú desplegable está abierto
    const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

    // Configuración de columnas para la tabla de oficinas (para el skeleton)
    const tableColumns: ColumnConfig[] = [
        { cell: { type: 'text' } },                        // Nombre
        { cell: { type: 'text', widthClass: 'w-1/2' } },   // Nombre de usuario
        { cell: { type: 'badge', widthClass: 'w-20' } },   // Estado
        { width: 'w-[70px]', cell: { type: 'action', align: 'center' }, header: { show: false } } // Acciones
    ]

    // Efecto para cerrar el menú desplegable cuando se abre un modal
    useEffect(() => {
        if (openEditDialog || openDeleteDialog) {
            setOpenDropdownId(null);
        }
    }, [openEditDialog, openDeleteDialog]);

    // Manejador para cuando cambia el estado del modal
    const handleModalOpenChange = (open: boolean, setOpen: (open: boolean) => void) => {
        if (!open) {
            // Asegurarnos de que todos los menús desplegables estén cerrados
            setOpenDropdownId(null);
            // Pequeño retraso para asegurar que el DOM se actualice correctamente
            setTimeout(() => {
                setOpen(open);
            }, 10);
        } else {
            setOpen(open);
        }
    };

    // Función para refrescar las oficinas, que devuelve una promesa
    const handleOfficeChange = async () => {
        await refreshOffices();
        return Promise.resolve();
    };

    // Contenido de la tabla
    const TableContent = (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Admin Asignado</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="w-[70px]">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {error ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-red-500">
                                Error: {error}
                            </TableCell>
                        </TableRow>
                    ) : offices.length > 0 ? (
                        offices.map((office) => (
                            <TableRow key={office.id}>
                                <TableCell>{office.id}</TableCell>
                                <TableCell className="font-medium">{office.name}</TableCell>
                                <TableCell>{office.agentAssigned}</TableCell>
                                <TableCell>
                                    <Badge variant={office.status === "active" ? "default" : "destructive"}>
                                        {office.status === "active" ? "Activo" : "Inactivo"}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu
                                        open={openDropdownId === office.id}
                                        onOpenChange={(open) => {
                                            setOpenDropdownId(open ? office.id : null);
                                        }}
                                    >
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() => {
                                                    setCurrentOffice(office);
                                                    setOpenDropdownId(null); // Cerrar el menú
                                                    setOpenEditDialog(true);
                                                }}
                                            >
                                                Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="text-red-600"
                                                onClick={() => {
                                                    setCurrentOffice(office);
                                                    setOpenDropdownId(null); // Cerrar el menú
                                                    setOpenDeleteDialog(true);
                                                }}
                                            >
                                                Eliminar
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No hay oficinas disponibles
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                    <CardTitle>Administrar Oficinas</CardTitle>
                    <CardDescription>Gestiona todas las oficinas y sus configuraciones</CardDescription>
                </div>
                <CreateOfficeModal onOfficeCreated={handleOfficeChange} />
            </CardHeader>
            <CardContent>
                {/* Tabla de oficinas */}
                <SkeletonLoader
                    skeleton={<TableSkeleton columns={tableColumns} rowCount={5} />}
                    isLoading={isLoading}
                >
                    {TableContent}
                </SkeletonLoader>

                {/* Modales para editar y eliminar con el nuevo manejador */}
                <EditOfficeModal
                    office={currentOffice}
                    open={openEditDialog}
                    onOpenChange={(open) => handleModalOpenChange(open, setOpenEditDialog)}
                    onOfficeUpdated={handleOfficeChange}
                />

                <DeleteOfficeModal
                    office={currentOffice}
                    open={openDeleteDialog}
                    onOpenChange={(open) => handleModalOpenChange(open, setOpenDeleteDialog)}
                    onOfficeDeleted={handleOfficeChange}
                />
            </CardContent>
        </Card>
    );
} 