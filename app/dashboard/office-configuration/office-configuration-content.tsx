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
import { CreateOfficeModal } from "./create-office-modal";
import { EditOfficeModal } from "./edit-office-modal";
import { DeleteOfficeModal } from "./delete-office-modal";
import { useOffices, Office } from "@/components/hooks/use-offices";
import { TableSkeleton, type ColumnConfig } from '@/components/ui/table-skeleton';
import { SkeletonLoader } from "@/components/skeleton-loader";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "next-auth/react";
import { OfficeSelector } from "@/components/office-selector";

export function OfficeConfigurationContent() {
  // Utilizamos el hook useOffices para obtener los datos
  const { offices, isLoading, error, refreshOffices } = useOffices();
  const { data: session } = useSession();


  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [currentOffice, setCurrentOffice] = useState<Office | null>(null);
  // Estado para controlar qué menú desplegable está abierto
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  // Configuración de columnas para la tabla de oficinas (para el skeleton)
  const tableColumns: ColumnConfig[] = [
    { cell: { type: 'text' } },                        // Nombre
    { cell: { type: 'text', widthClass: 'w-1/2' } },   // Nombre de usuario
    { cell: { type: 'text', widthClass: 'w-2/3' } },   // Carga Mínima
    { cell: { type: 'text', widthClass: 'w-2/3' } },   // Retiro Mínimo
    { cell: { type: 'badge', widthClass: 'w-20' } },   // Estado
    { width: 'w-[70px]', cell: { type: 'action', align: 'center' }, header: { show: false } } // Acciones
  ]

  // Efecto para cerrar el menú desplegable cuando se abre un modal
  useEffect(() => {
    if (openEditDialog || openDeleteDialog) {
      console.log("session", session);
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

  // Header con título y botón de crear
  const HeaderContent = (
    <div className="flex justify-between items-center">
      <h1 className="text-2xl font-bold tracking-tight">Oficinas</h1>

      {session?.user?.role === 'superadmin' && <OfficeSelector />}
      <CreateOfficeModal onOfficeCreated={handleOfficeChange} />
    </div>
  )

  // Skeleton del header
  const HeaderSkeleton = (
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-10 w-36" />
    </div>
  )

  // Contenido de la tabla
  const TableContent = (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Nombre de usuario</TableHead>
            <TableHead>Carga Mínima</TableHead>
            <TableHead>Retiro Mínimo</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-[70px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {error ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-red-500">
                Error: {error}
              </TableCell>
            </TableRow>
          ) : offices.length > 0 ? (
            offices.map((office) => (
              <TableRow key={office.id}>
                <TableCell className="font-medium">{office.name}</TableCell>
                <TableCell>{office.agentAssigned}</TableCell>
                <TableCell>{office.minDeposit}</TableCell>
                <TableCell>{office.minWithdrawal}</TableCell>
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
              <TableCell colSpan={6} className="h-24 text-center">
                No hay oficinas disponibles
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header con título y botón de crear */}
      <SkeletonLoader
        skeleton={HeaderSkeleton}
        isLoading={isLoading}
      >
        {HeaderContent}
      </SkeletonLoader>

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
    </div>
  );
} 