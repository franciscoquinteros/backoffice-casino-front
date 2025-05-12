"use client"

import { useState, useEffect } from "react"
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
  initialTickets: Ticket[]
}

export function TicketsClient({ initialTickets }: TicketsClientProps) {
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

  // Obtener los operadores al cargar el componente
  useEffect(() => {
    const fetchOperators = async () => {
      if (!session?.accessToken) {
        console.error('No authentication token available');
        return;
      }

      // Debug JWT token
      console.log('Raw token:', session.accessToken);
      try {
        const tokenParts = session.accessToken.split('.');
        console.log('Token parts length:', tokenParts.length);

        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('JWT Payload:', {
            officeId: payload.officeId,
            role: payload.role,
            sub: payload.sub,
            exp: new Date(payload.exp * 1000).toISOString()
          });
        } else {
          console.error('Invalid JWT format - expected 3 parts');
        }
      } catch (e) {
        console.error('Error parsing JWT:', e);
        // Mostrar el token completo para debug
        console.log('Session data:', {
          token: session.accessToken,
          user: session.user,
          officeId: session.user?.officeId
        });
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

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (response.ok) {
          const data = await response.json();
          setOperators(data);
        } else {
          const errorText = await response.text();
          console.error('Error fetching operators:', errorText);
          try {
            const errorData = JSON.parse(errorText);
            console.error('Error details:', errorData);
          } catch (e) {
            // Si no se puede parsear como JSON, ya tenemos el texto del error
          }
        }
      } catch (error) {
        console.error('Error fetching operators:', error);
      }
    };

    fetchOperators();
  }, [session?.accessToken]);

  // Efecto para cargar los datos iniciales con un retraso simulado
  useEffect(() => {
    if (Array.isArray(initialTickets)) {
      setTimeout(() => {
        setTickets(initialTickets)
        setFilteredTickets(initialTickets)
        setIsLoading(false)
      }, 800) // Añadimos un pequeño retraso para mostrar el skeleton
    }
  }, [initialTickets])

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

  const TableContent = (
    <Card>
      <TicketsTable tickets={filteredTickets} />
    </Card>
  )

  return (
    <>
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