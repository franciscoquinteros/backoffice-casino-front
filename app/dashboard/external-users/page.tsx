// app/dashboard/external-users/page.tsx

// --- Ya no necesitas Suspense aquí si UsersClient maneja su carga ---
// import { Suspense } from "react"
import { UsersClient } from "@/components/users/users-client"; // Ajusta ruta
import { RoleGuard } from "@/components/role-guard"; // Ajusta ruta
// --- Ya no necesitas estos imports si UsersClient maneja skeletons ---
// import { TableSkeleton, type ColumnConfig } from '@/components/ui/table-skeleton'
// import { Skeleton } from '@/components/ui/skeleton'
// import { Card } from '@/components/ui/card'


// --- 1. ELIMINA la función fetchExternalUsers ---
// const fetchExternalUsers = async () => { ... }


// --- 2. ELIMINA el componente LoadingSkeleton si UsersClient tiene el suyo ---
// function LoadingSkeleton() { ... }


export default async function ExternalUsersPage() { // El nombre está bien

    // --- 3. ELIMINA la llamada a fetchExternalUsers ---
    // const externalUsers = await fetchExternalUsers() || [];

    return (
        <RoleGuard allowedRoles={['admin', 'encargado', 'superadmin']}>
            {/* El div wrapper opcional para padding */}
            <div className="p-6">
                {/* --- 4. ELIMINA Suspense (UsersClient maneja su carga) --- */}
                {/* <Suspense fallback={<LoadingSkeleton />}> */}

                {/* --- 5. Llama a UsersClient SIN initialUsers --- */}
                <UsersClient
                    userType="external" // Solo pasas userType
                />
                {/* --- Fin llamada corregida --- */}

                {/* </Suspense> */}
            </div>
        </RoleGuard>
    );
}