import { Suspense } from 'react';
import { RoleGuard } from '@/components/role-guard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SuperDashboardSkeleton from './components/super-dashboard-skeleton';
import SuperDashboardContent from './components/super-dashboard-content';

export default function SuperDashboardPage() {
    return (
        <RoleGuard allowedRoles={['superadmin']}>
            <div className="container mx-auto p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl sm:text-2xl font-bold">Panel Centralizado</h1>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        Vista consolidada de todas las oficinas
                    </div>
                </div>
                <Suspense fallback={<SuperDashboardSkeleton />}>
                    <SuperDashboardContent />
                </Suspense>
            </div>
        </RoleGuard>
    );
} 