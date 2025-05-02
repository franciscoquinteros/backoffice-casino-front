"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton, type ColumnConfig } from '@/components/ui/table-skeleton';
import { SkeletonLoader } from '@/components/skeleton-loader';
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { TicketsTable } from '@/components/tickets/tickets-table';
import { TicketsFilters } from '@/components/tickets/tickets-filters';
import { Ticket, TicketFilter } from '@/components/hooks/tickets';
; // Ajusta la ruta según tu estructura de carpetas
// Definir interfaz Ticket



export function TicketsClient() {
  const { data: session, status: sessionStatus } = useSession();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [filters, setFilters] = useState<TicketFilter>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Definir columnas para el skeleton
  const tableColumns: ColumnConfig[] = [
    { width: 'w-[70px]', cell: { type: 'text' } },
    { cell: { type: 'double' } },
    { cell: { type: 'text' } },
    { cell: { type: 'text', className: 'truncate' } },
    { cell: { type: 'badge', widthClass: 'w-24' } },
    { cell: { type: 'double' } },
    { cell: { type: 'text', widthClass: 'w-32' } },
    { cell: { type: 'text', widthClass: 'w-32' } },
  ];

  // Función para cargar tickets de la oficina del usuario
  const fetchTicketsForOffice = useCallback(async (showLoadingState = false) => {
    if (sessionStatus !== "authenticated" || !session?.accessToken || !session?.user?.officeId) {
      if (sessionStatus === "authenticated") {
        setError("Datos de sesión incompletos. No se encontró ID de oficina.");
      }
      setIsLoading(false);
      return;
    }

    const accessToken = session.accessToken;
    const userOffice = session.user.officeId;

    if (!showLoadingState) setIsLoading(true);
    setError(null);

    try {
      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/zendesk/tickets/all`;
      console.log(`Cargando tickets para oficina ${userOffice} desde: ${url}`);

      // La oficina se envía automáticamente mediante el token JWT
      // El backend extraerá la oficina del token en el controlador
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        let errorMsg = 'Error al obtener tickets';
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
        } catch { }

        if (response.status === 500 && errorMsg.toLowerCase().includes('invalid url')) {
          console.warn("Backend reportó error de URL de Zendesk, mostrando lista vacía.");
          setTickets([]);
          setFilteredTickets([]);
          setError(null);
          return;
        }
        throw new Error(errorMsg);
      }

      const fetchedTickets: Ticket[] = await response.json();
      setTickets(fetchedTickets);
      const currentlyFiltered = applyTicketFilters(fetchedTickets, filters);
      setFilteredTickets(currentlyFiltered);

    } catch (error: unknown) {
      console.error(`Error al cargar tickets:`, error);
      setError("Error al cargar tickets. Intenta de nuevo más tarde.");
      setTickets([]);
      setFilteredTickets([]);
    } finally {
      setIsLoading(false);
    }
  }, [session, sessionStatus, filters]);

  // Carga inicial
  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchTicketsForOffice(true);
    } else if (sessionStatus === "unauthenticated") {
      setIsLoading(false);
      setError("Necesitas iniciar sesión.");
    }
  }, [sessionStatus, fetchTicketsForOffice]);

  // Re-filtrar cuando cambien los filtros
  useEffect(() => {
    const filtered = applyTicketFilters(tickets, filters);
    setFilteredTickets(filtered);
  }, [filters, tickets]);

  // Función para filtrar tickets en el cliente
  const applyTicketFilters = (allTickets: Ticket[], currentFilters: TicketFilter): Ticket[] => {
    let filtered = [...allTickets];
    console.log("Filtrando tickets:", currentFilters);

    // Status
    if (currentFilters.status && currentFilters.status !== 'all') {
      filtered = filtered.filter(t => t.status?.toLowerCase() === currentFilters.status?.toLowerCase());
    }

    // Agente Asignado (interno)
    if (currentFilters.agentId && currentFilters.agentId !== 'all') {
      filtered = filtered.filter(t => t.internal_assignee?.id?.toString() === currentFilters.agentId);
    }

    // Búsqueda General
    if (currentFilters.search) {
      const searchLower = currentFilters.search.toLowerCase();
      filtered = filtered.filter(t =>
        (t.id?.toString() ?? '').includes(searchLower) ||
        (t.subject?.toLowerCase() ?? '').includes(searchLower) ||
        (t.user?.name?.toLowerCase() ?? '').includes(searchLower) ||
        (t.user?.email?.toLowerCase() ?? '').includes(searchLower) ||
        (t.internal_assignee?.name?.toLowerCase() ?? '').includes(searchLower) ||
        (t.internal_assignee?.username?.toLowerCase() ?? '').includes(searchLower) ||
        (t.internal_assignee?.email?.toLowerCase() ?? '').includes(searchLower)
      );
    }

    // Fechas
    if (currentFilters.dateFrom) {
      try {
        const fromDate = new Date(currentFilters.dateFrom).getTime();
        filtered = filtered.filter(t => t.created_at && new Date(t.created_at).getTime() >= fromDate);
      } catch { // <-- Sin variable 'error'
        console.error("Invalid dateFrom filter");
      }
    }

    if (currentFilters.dateTo) {
      try {
        const toDate = new Date(currentFilters.dateTo).getTime();
        filtered = filtered.filter(t => t.created_at && new Date(t.created_at).getTime() <= toDate);
      } catch { // <-- Sin variable 'error'
        console.error("Invalid dateTo filter");
      }
    }

    return filtered;
  };

  // Handlers de Filtros
  const handleFilterChange = (newFilters: Partial<TicketFilter>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setFilters({});
  };

  // Renderizado condicional
  if (sessionStatus === "loading") {
    return (
      <div className="p-6">
        <HeaderSkeleton />
        <FiltersSkeleton />
        <Card><TableSkeleton columns={tableColumns} rowCount={8} /></Card>
      </div>
    );
  }

  if (sessionStatus === "unauthenticated") {
    return <div className="p-6"><p>Necesitas iniciar sesión para ver los tickets.</p></div>;
  }

  return (
    <div className="p-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-x-2">
          <h1 className="text-3xl font-bold">Tickets</h1>
          {session?.user?.officeId && (
            <Badge variant="outline">Oficina: {session.user.officeId}</Badge>
          )}
        </div>
      </div>

      {/* Filtros */}
      <SkeletonLoader skeleton={<FiltersSkeleton />} isLoading={isLoading && tickets.length === 0}>
        <TicketsFilters onChange={handleFilterChange} onReset={handleResetFilters} />
      </SkeletonLoader>

      {/* Tabla o Estados */}
      <SkeletonLoader
        skeleton={<TableSkeleton columns={tableColumns} rowCount={8} />}
        isLoading={isLoading && tickets.length === 0}
      >
        {error && !isLoading ? (
          <Card className="p-8 text-center my-4 border-destructive/50 bg-destructive/10">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </Card>
        ) : !error && tickets.length > 0 && filteredTickets.length === 0 && !isLoading ? (
          <Card className="p-8 text-center my-4 border rounded-md">
            <p className="text-lg text-muted-foreground mb-4">No se encontraron tickets con los filtros actuales.</p>
            <Button variant="outline" onClick={handleResetFilters}>Limpiar Filtros</Button>
          </Card>
        ) : !error && tickets.length === 0 && !isLoading ? (
          <div className="flex flex-col justify-center items-center h-64 border rounded-md">
            <p className="text-lg text-muted-foreground mb-4">No hay tickets para mostrar</p>
          </div>
        ) : !error ? (
          <TicketsTable tickets={filteredTickets} />
        ) : null}
      </SkeletonLoader>
    </div>
  );
}

// Componentes Skeleton
const FiltersSkeleton = () => (
  <Card className="mb-4 p-6 space-y-6 animate-pulse">
    <div className="flex flex-col md:flex-row justify-between">
      <Skeleton className="h-5 w-20 mb-4 rounded" />
      <Skeleton className="h-9 w-28 rounded" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <div className="space-y-2"><Skeleton className="h-4 w-24 rounded" /><Skeleton className="h-10 w-full rounded" /></div>
      <div className="space-y-2"><Skeleton className="h-4 w-24 rounded" /><Skeleton className="h-10 w-full rounded" /></div>
      <div className="space-y-2"><Skeleton className="h-4 w-24 rounded" /><Skeleton className="h-10 w-full rounded" /></div>
      <div className="space-y-2"><Skeleton className="h-4 w-24 rounded" /><Skeleton className="h-10 w-full rounded" /></div>
      <div className="space-y-2"><Skeleton className="h-4 w-24 rounded" /><Skeleton className="h-10 w-full rounded" /></div>
    </div>
  </Card>
);

const HeaderSkeleton = () => (
  <div className="flex justify-between items-center mb-6 animate-pulse">
    <div className="flex items-center gap-x-2">
      <Skeleton className="h-9 w-24 rounded" />
      <Skeleton className="h-6 w-32 rounded" />
    </div>
  </div>
);