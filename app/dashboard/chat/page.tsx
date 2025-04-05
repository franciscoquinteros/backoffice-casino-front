import { Suspense } from 'react';
import { MessagesSquare } from 'lucide-react';
import { RoleGuard } from '@/components/role-guard';
import ChatDashboard from './ChatDashboard';
import { ChatPageSkeleton } from './components/ChatPageSkeleton';

export default function ChatPage() {
  return (
    <RoleGuard allowedRoles={['admin', 'operador', 'encargado', 'superadmin']}>
      <div className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
          <div className="flex items-center gap-2">
            <MessagesSquare className="h-6 w-6 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold">Chat con clientes</h1>
          </div>
          <div className="text-sm text-muted-foreground">
            Gestiona todas las conversaciones con los usuarios
          </div>
        </div>
        <Suspense fallback={<ChatPageSkeleton />}>
          <ChatDashboard />
        </Suspense>
      </div>
    </RoleGuard>
  );
}