// app/dashboard/users/page.tsx

// Quita Suspense si UsersClient maneja su skeleton
// import { Suspense } from "react";
import { UsersClient } from "@/components/users/users-client"; // Ajusta ruta
import { RoleGuard } from "@/components/role-guard"; // Ajusta ruta
// Quita imports de Skeleton si UsersClient los maneja internamente
// import { TableSkeleton, type ColumnConfig } from '@/components/ui/table-skeleton';
// import { Skeleton } from '@/components/ui/skeleton';

// --- 1. ELIMINA la función fetchInternalUsers ---
// const fetchInternalUsers = async () => { ... }

// --- 2. ELIMINA el componente LoadingSkeleton ---
// function LoadingSkeleton() { ... }


export default async function UsersPage() { // Cambia nombre si prefieres InternalUsersPage

  // --- 3. ELIMINA la llamada a fetchInternalUsers ---
  // const internalUsers = await fetchInternalUsers();

  return (
    <RoleGuard allowedRoles={['admin', 'encargado', 'superadmin']}>
      {/* El div wrapper opcional */}
      <div className="p-6">
        {/* --- 4. ELIMINA Suspense --- */}
        {/* <Suspense fallback={<LoadingSkeleton />}> */}

        {/* --- 5. Llama a UsersClient SIN initialUsers --- */}
        <UsersClient
          userType="internal" // Solo pasas userType
        />
        {/* --- Fin llamada corregida --- */}

        {/* </Suspense> */}
      </div>
    </RoleGuard>
  );
}