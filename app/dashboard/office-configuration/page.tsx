import { Suspense } from 'react'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { Skeleton } from '@/components/ui/skeleton'
import { type ColumnConfig } from '@/components/ui/table-skeleton'
import { OfficeConfigurationContent } from './office-configuration-content'
import { RoleGuard } from '@/components/role-guard'

// Skeleton para la página completa que se usa con Suspense
function OfficeConfigurationSkeleton() {
  // Configuración de columnas para la tabla de oficinas
  const tableColumns: ColumnConfig[] = [
    { cell: { type: 'text' } },                        // Nombre
    { cell: { type: 'text', widthClass: 'w-1/2' } },   // Whatsapp
    { cell: { type: 'text', widthClass: 'w-1/2' } },   // Telegram
    { cell: { type: 'text', widthClass: 'w-2/3' } },   // Bono 1ra carga
    { cell: { type: 'text', widthClass: 'w-2/3' } },   // Bono perpetuo
    { cell: { type: 'text', widthClass: 'w-2/3' } },   // Carga Mínima
    { cell: { type: 'text', widthClass: 'w-2/3' } },   // Retiro Mínimo
    { cell: { type: 'text', widthClass: 'w-2/3' } },   // Mínimo Espera Retiro
    { cell: { type: 'badge', widthClass: 'w-20' } },   // Estado
    { width: 'w-[70px]', cell: { type: 'action', align: 'center' }, header: { show: false } } // Acciones
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-36" />
      </div>

      <TableSkeleton columns={tableColumns} rowCount={5} />
    </div>
  )
}

export default function OfficeConfigurationPage() {
  return (
    <RoleGuard allowedRoles={['admin', 'superadmin']}>
      <Suspense fallback={<OfficeConfigurationSkeleton />}>
        <OfficeConfigurationContent />
      </Suspense>
    </RoleGuard>
  )
}
