import { Suspense } from 'react'
import { TicketsClient, type Ticket } from "@/components/tickets/tickets-client"
import { RoleGuard } from "@/components/role-guard"
import { TableSkeleton, type ColumnConfig } from '@/components/ui/table-skeleton'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

// Fetch tickets data from the server
const fetchTickets = async () => {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL
  const response = await fetch(`${baseUrl}/zendesk/tickets/all`, {
    cache: 'no-store'
  })
  const data = await response.json()
  const tickets = Array.isArray(data) ? data : data?.tickets || []
  return tickets
}

// Skeleton component for the tickets page
function TicketsPageSkeleton() {
  // Configuración de columnas para la tabla de tickets
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
  
  // Skeleton for the filter card
  const FiltersSkeleton = (
    <Card className="mb-4 p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between">
        <Skeleton className="h-5 w-20 mb-4" />
        <Skeleton className="h-9 w-28" />
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-10 w-32" />
      </div>
      
      {FiltersSkeleton}
      
      <Card>
        <TableSkeleton columns={tableColumns} rowCount={5} />
      </Card>
    </div>
  )
}

// Tickets content component that renders the client component
function TicketsContent({ tickets }: { tickets: Ticket[] }) {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Tickets</h1>
      </div>

      <TicketsClient initialTickets={tickets} />
    </div>
  )
}

export default async function TicketsPage() {
  // Fetch the tickets data
  const tickets = await fetchTickets()

  return (
    <RoleGuard allowedRoles={['admin', 'operador', 'encargado', 'superadmin']} fallbackUrl="/dashboard">
      <Suspense fallback={<TicketsPageSkeleton />}>
        <TicketsContent tickets={tickets} />
      </Suspense>
    </RoleGuard>
  )
}
