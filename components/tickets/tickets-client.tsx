"use client"

import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TableSkeleton, type ColumnConfig } from '@/components/ui/table-skeleton'
import { SkeletonLoader } from "@/components/skeleton-loader"
import { Skeleton } from "@/components/ui/skeleton"
import { TicketsTable } from "./tickets-table"
import { Ticket } from "../hooks/tickets"
import { useSession } from "next-auth/react"

// Sharing the same type definition between components
export interface TicketUser {
  name: string
  email: string
}

// Interfaz para el operador asignado internamente
export interface InternalAssignee {
  username: string
  id: number
  name: string
  email: string
}

interface TicketsClientProps {
  initialTickets?: Ticket[] // Hacemos esto opcional
}

export function TicketsClient({ initialTickets = [] }: TicketsClientProps) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([])
  const [operators, setOperators] = useState<{ id: number, username: string, email: string, ticketCount: number }[]>([])
  const [filters, setFilters] = useState({
    subject: "",
    status: "all",
    user: "",
    dateRange: "all",
    operator: "all"
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { data: session } = useSession();

  // Log session data to debug
  useEffect(() => {
    console.log('Current session:', {
      status: session?.user?.officeId ? 'Has officeId' : 'No officeId',
      officeId: session?.user?.officeId,
      role: session?.user?.role,
      hasToken: !!session?.accessToken
    });
  }, [session]);

  // Configuración de columnas para la tabla de tickets (para el skeleton)
  const tableColumns: ColumnConfig[] = [
    { width: 'w-[70px]', cell: { type: 'text', widthClass: 'w-12' } },    // ID
    { cell: { type: 'double', widthClass: 'w-3/4' } },                    // Usuario
    { cell: { type: 'text', widthClass: 'w-full' } },                     // Asunto
    { cell: { type: 'text', widthClass: 'w-full' } },                     // Detalle
    { cell: { type: 'badge', widthClass: 'w-20' } },                      // Estado
    { cell: { type: 'double', widthClass: 'w-3/4' } },                    // Operador Asignado
    { cell: { type: 'text', widthClass: 'w-32' } },                       // Creado
    { cell: { type: 'text', widthClass: 'w-32' } },                       // Actualizado
  ]

  // Función para obtener tickets desde la API
  const fetchTickets = useCallback(async () => {
    if (!session?.accessToken) {
      console.error('No authentication token available');
      setError('No se pudo autenticar. Por favor, inicie sesión nuevamente.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('Fetching tickets from API...');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/zendesk/tickets/all`,
        {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      console.log('Tickets API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching tickets:', errorText);
        throw new Error(`Error al cargar tickets: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`Successfully fetched ${data.length} tickets`);
      setTickets(data);
      setFilteredTickets(data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar los tickets. Por favor, intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  }, [session?.accessToken]);

  // Obtener los operadores al cargar el componente
  useEffect(() => {
    const fetchOperators = async () => {
      if (!session?.accessToken) {
        console.error('No authentication token available');
        return;
      }

      try {
        console.log('Making request to:', `${process.env.NEXT_PUBLIC_BACKEND_URL}/zendesk/operators-with-ticket-counts`);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/zendesk/operators-with-ticket-counts`,
          {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Accept': 'application/json'
            }
          }
        );

        console.log('Operators response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error fetching operators: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        setOperators(data);
      } catch (error) {
        console.error('Error fetching operators:', error);
        // No establecemos error global para los operadores ya que no es crítico
      }
    };

    fetchOperators();
  }, [session?.accessToken, session?.user]);

  // Obtener tickets al cargar el componente o cuando cambie la sesión
  useEffect(() => {
    if (session?.accessToken) {
      // Si initialTickets tiene datos y es la primera carga, usarlos como estado inicial
      if (initialTickets && initialTickets.length > 0 && tickets.length === 0) {
        setTickets(initialTickets);
        setFilteredTickets(initialTickets);
        setIsLoading(false);
      } else {
        // De lo contrario, obtener tickets de la API
        fetchTickets();
      }
    }
  }, [session?.accessToken, initialTickets, fetchTickets, tickets.length]);

  // Aplicar filtros cuando cambian los tickets o los filtros
  useEffect(() => {
    const filtered = tickets.filter(ticket => {
      // Safely handle potentially null values
      const ticketSubject = ticket.subject || ""
      const ticketStatus = ticket.status || ""
      const userName = ticket.user?.name || ""
      const userEmail = ticket.user?.email || ""

      // Obtener el ID del operador asignado
      const operatorId = ticket.internal_assignee?.id?.toString() || "";

      const subjectMatch = ticketSubject.toLowerCase().includes(filters.subject.toLowerCase())
      const statusMatch = filters.status === "all" || ticketStatus.toLowerCase() === filters.status.toLowerCase()
      const userMatch = !filters.user ||
        userName.toLowerCase().includes(filters.user.toLowerCase()) ||
        userEmail.toLowerCase().includes(filters.user.toLowerCase())

      // Filtrado por operador por ID
      const operatorMatch =
        filters.operator === "all" ||
        (filters.operator === "unassigned" && !operatorId) ||
        operatorId === filters.operator;

      // Date filtering logic
      let dateMatch = true
      if (filters.dateRange !== "all" && ticket.created_at) {
        const ticketDate = new Date(ticket.created_at)
        const now = new Date()

        switch (filters.dateRange) {
          case "today":
            dateMatch = ticketDate.toDateString() === now.toDateString()
            break
          case "yesterday":
            const yesterday = new Date(now)
            yesterday.setDate(now.getDate() - 1)
            dateMatch = ticketDate.toDateString() === yesterday.toDateString()
            break
          case "thisWeek":
            const weekStart = new Date(now)
            weekStart.setDate(now.getDate() - now.getDay())
            dateMatch = ticketDate >= weekStart
            break
          case "thisMonth":
            dateMatch =
              ticketDate.getMonth() === now.getMonth() &&
              ticketDate.getFullYear() === now.getFullYear()
            break
          default:
            dateMatch = true
        }
      }

      return subjectMatch && statusMatch && userMatch && dateMatch && operatorMatch
    })

    setFilteredTickets(filtered)
  }, [tickets, filters])

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const clearFilters = () => {
    setFilters({
      subject: "",
      status: "all",
      user: "",
      dateRange: "all",
      operator: "all"
    })
  }

  // Función para recargar los tickets
  const refreshTickets = () => {
    setIsLoading(true);
    fetchTickets();
  };

  const statusOptions = [
    { value: "all", label: "Todos los estados" },
    { value: "open", label: "Abierto" },
    { value: "pending", label: "Pendiente" },
    { value: "solved", label: "Resuelto" },
    { value: "closed", label: "Cerrado" }
  ]

  const dateRangeOptions = [
    { value: "all", label: "Cualquier fecha" },
    { value: "today", label: "Hoy" },
    { value: "yesterday", label: "Ayer" },
    { value: "thisWeek", label: "Esta semana" },
    { value: "thisMonth", label: "Este mes" }
  ]

  // Componentes para alternar entre el skeleton y el contenido real
  const FiltersContent = (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filtros</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshTickets}
              className="h-8 gap-1"
            >
              Actualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="h-8 gap-1"
            >
              <X className="h-4 w-4" />
              Limpiar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Asunto</label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por asunto..."
                className="pl-8"
                value={filters.subject}
                onChange={(e) => handleFilterChange("subject", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Estado</label>
            <Select
              value={filters.status}
              onValueChange={(value) => handleFilterChange("status", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Usuario</label>
            <Input
              placeholder="Buscar por nombre o email..."
              value={filters.user}
              onChange={(e) => handleFilterChange("user", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Fecha de creación</label>
            <Select
              value={filters.dateRange}
              onValueChange={(value) => handleFilterChange("dateRange", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar rango" />
              </SelectTrigger>
              <SelectContent>
                {dateRangeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Operador Asignado</label>
            <Select
              value={filters.operator}
              onValueChange={(value) => handleFilterChange("operator", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar operador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los operadores</SelectItem>
                <SelectItem value="unassigned">Sin asignar</SelectItem>
                {operators.map(op => (
                  <SelectItem key={op.id} value={op.id.toString()}>
                    {op.username} ({op.ticketCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const FiltersSkeleton = (
    <Card className="mb-4 p-6 space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </Card>
  )

  // Mostrar mensaje de error si existe
  const ErrorMessage = error && (
    <Card className="mb-4 p-4 bg-red-50 border-red-200">
      <div className="text-red-600">
        {error}
      </div>
    </Card>
  );

  const TableContent = (
    <Card>
      <TicketsTable tickets={filteredTickets} />
    </Card>
  )

  return (
    <>
      {ErrorMessage}

      {/* Filtros con skeleton */}
      <SkeletonLoader
        skeleton={FiltersSkeleton}
        isLoading={isLoading}
      >
        {FiltersContent}
      </SkeletonLoader>

      {/* Tabla con skeleton */}
      <SkeletonLoader
        skeleton={
          <Card>
            <TableSkeleton columns={tableColumns} rowCount={5} />
          </Card>
        }
        isLoading={isLoading}
      >
        {TableContent}
      </SkeletonLoader>
    </>
  )
}