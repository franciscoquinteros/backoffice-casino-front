import { Suspense } from 'react'
import { TransferAccountsContent } from '@/components/transfer-accounts/transfer-accounts-content'
import { TableSkeleton, type ColumnConfig } from '@/components/ui/table-skeleton'
import { Skeleton } from '@/components/ui/skeleton'
import { RoleGuard } from '@/components/role-guard'

// Skeleton para la página completa que se usa con Suspense
function TransferAccountsPageSkeleton() {
  // Configuración de columnas para la tabla de cuentas de transferencia
  const tableColumns: ColumnConfig[] = [
    { cell: { type: 'text' } }, // Nombre
    { cell: { type: 'text', widthClass: 'w-1/2' } }, // Oficina
    { cell: { type: 'text', widthClass: 'w-4/5' } }, // CBU
    { cell: { type: 'text', widthClass: 'w-4/5' } }, // Alias
    { cell: { type: 'badge', widthClass: 'w-28' } }, // Billetera
    { cell: { type: 'text', widthClass: 'w-3/4' } }, // Operador
    { cell: { type: 'text', widthClass: 'w-2/3' } }, // Agente
    { cell: { type: 'badge', widthClass: 'w-20' } }, // Estado
    { width: 'w-[50px]', cell: { type: 'action', align: 'center' }, header: { show: false } } // Acciones
  ]
  
  return (
    <div className="container mx-auto py-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
      
      {/* Tabla genérica con la configuración específica */}
      <TableSkeleton columns={tableColumns} rowCount={6} />
    </div>
  )
}

export default function TransferAccountsPage() {
  return (
    <RoleGuard allowedRoles={['admin', 'operador', 'encargado', 'superadmin']}>
      <Suspense fallback={<TransferAccountsPageSkeleton />}>
        <TransferAccountsContent />
      </Suspense>
    </RoleGuard>
  )
}
