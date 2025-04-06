import { Suspense } from 'react';
import { RoleGuard } from '@/components/role-guard';
import { TableSkeleton, type ColumnConfig } from '@/components/ui/table-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { WebMonitoringContent } from './web-monitoring-content';

// Componente para el skeleton de la página web-monitoring
function WebMonitoringSkeleton() {
  // Configuración de columnas para la tabla de monitoreo web
  const tableColumns: ColumnConfig[] = [
    { width: 'w-[100px]', cell: { type: 'text', widthClass: 'w-20' } },     // ID de Pago
    { cell: { type: 'text', widthClass: 'w-full' } },                       // Descripción
    { cell: { type: 'text', widthClass: 'w-24' } },                         // Monto
    { cell: { type: 'badge', widthClass: 'w-24' } },                        // Estado
    { cell: { type: 'text', widthClass: 'w-40' } },                         // Fecha de Creación
    { cell: { type: 'text', widthClass: 'w-32' } },                         // Método de Pago
    { cell: { type: 'text', widthClass: 'w-40' } },                         // Email del Pagador
    { cell: { type: 'action', widthClass: 'w-24', align: 'center' } },      // Acción
  ];

  return (
    <div className="container mx-auto p-4">
      <Skeleton className="h-8 w-64 mb-4" />
      
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-10 w-56" />
      </div>
      
      <Card>
        <TableSkeleton columns={tableColumns} rowCount={8} />
      </Card>
    </div>
  );
}

export default function WebMonitoringPage() {
  return (
    <RoleGuard allowedRoles={['admin', 'encargado', 'superadmin']}>
      <Suspense fallback={<WebMonitoringSkeleton />}>
        <WebMonitoringContent />
      </Suspense>
    </RoleGuard>
  );
}