import { Suspense } from 'react';
import { RoleGuard } from '@/components/role-guard';
import { TableSkeleton, type ColumnConfig } from '@/components/ui/table-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { TransferMonitoringContent } from './transfer-monitoring-content';

// Skeleton para la página de monitoreo de transferencias
function TransferMonitoringSkeleton() {
  // Configuración de columnas para la tabla de monitoreo
  const tableColumns: ColumnConfig[] = [
    { width: 'w-[70px]', cell: { type: 'text', widthClass: 'w-12' } },    // ID
    { cell: { type: 'text', widthClass: 'w-24' } },                       // Tipo
    { cell: { type: 'text', widthClass: 'w-20' } },                       // Monto
    { cell: { type: 'text', widthClass: 'w-full' } },                     // Descripción
    { cell: { type: 'badge', widthClass: 'w-24' } },                      // Estado
    { cell: { type: 'text', widthClass: 'w-40' } },                       // Fecha de Creación
    { cell: { type: 'text', widthClass: 'w-32' } },                       // Método/Cuenta
    { cell: { type: 'text', widthClass: 'w-40' } },                       // Email/Cuenta Destino
    { cell: { type: 'action', widthClass: 'w-24', align: 'center' } },    // Acción
  ];

  return (
    <div className="container mx-auto p-4">
      <Skeleton className="h-8 w-64 mb-4" />
      
      <Card>
        <TableSkeleton columns={tableColumns} rowCount={8} />
      </Card>
    </div>
  );
}

export default function TransferMonitoringPage() {
  return (
    <RoleGuard allowedRoles={['admin', 'operador', 'encargado', 'superadmin']}>
      <Suspense fallback={<TransferMonitoringSkeleton />}>
        <TransferMonitoringContent />
      </Suspense>
    </RoleGuard>
  );
}