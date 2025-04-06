// app/dashboard/users/page.tsx
import { Suspense } from "react"
import { UsersClient } from "@/components/users/users-client"
import { RoleGuard } from "@/components/role-guard"
import { TableSkeleton, type ColumnConfig } from '@/components/ui/table-skeleton'
import { Skeleton } from "@/components/ui/skeleton"

const fetchInternalUsers = async () => {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/users`
  const response = await fetch(url, {
    cache: 'no-store', // Evitar caché
  })
  if (!response.ok) {
    return []
  }
  const data = await response.json()
  return data
}

// Componente de carga
function LoadingSkeleton() {
  // Configuración de columnas para la tabla de usuarios
  const tableColumns: ColumnConfig[] = [
    { cell: { type: 'double', widthClass: 'w-3/4' } }, // Nombre/Email
    { cell: { type: 'text', widthClass: 'w-16' } },    // Rol
    { cell: { type: 'text', widthClass: 'w-20' } },    // Oficina
    { cell: { type: 'badge', widthClass: 'w-14' } },   // Estado
    { width: 'w-[50px]', cell: { type: 'action', align: 'right' }, header: { show: false } } // Acciones
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-10 w-40" />
      </div>

      <div className="mt-6">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-7 w-64" />
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="flex-1">
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="flex-1">
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="flex-1">
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <TableSkeleton columns={tableColumns} rowCount={8} />
      </div>
    </div>
  )
}

export default async function UsersPage() {
  // Cargamos los datos de usuarios internos en el servidor
  const internalUsers = await fetchInternalUsers();

  return (
    <RoleGuard allowedRoles={['admin', 'encargado', 'superadmin']}>
      <div className="p-6">
        <Suspense fallback={<LoadingSkeleton />}>
          <UsersClient
            initialUsers={internalUsers}
            userType="internal"
          />
        </Suspense>
      </div>
    </RoleGuard>
  )
}