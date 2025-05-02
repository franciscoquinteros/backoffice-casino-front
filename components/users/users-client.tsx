// Ruta Ejemplo: components/users/users-client.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { UsersTable } from "./users-table";         // Ajusta ruta
import { UsersFilters } from "./users-filters";     // Ajusta ruta
import type { User } from "@/types/user";            // Ajusta ruta
import { CreateUserModal } from "@/app/dashboard/users/create-user-modal"; // Ajusta ruta
import { SkeletonLoader } from "@/components/skeleton-loader"; // Ajusta ruta
import { Skeleton } from "@/components/ui/skeleton";       // Ajusta ruta
import { TableSkeleton, type ColumnConfig } from '@/components/ui/table-skeleton'; // Ajusta ruta
import { toast } from 'sonner';
import { Card } from "@/components/ui/card";               // Ajusta ruta
import { Badge } from "@/components/ui/badge";             // Ajusta ruta
import { Button } from "@/components/ui/button";           // Ajusta ruta

// Interfaz para Filtros (asegúrate que coincida con UsersFilters)
export interface UserFilter {
  username?: string; // Para búsqueda general (nombre, email)
  role?: string;
  status?: string;
  office?: string;
  // Añade otros si los usas
}

export function UsersClient({ userType }: { userType: 'internal' | 'external' }) {
  const { data: session, status: sessionStatus } = useSession();

  const [users, setUsers] = useState<User[]>([]); // Lista base
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]); // Lista filtrada para mostrar
  const [filters, setFilters] = useState<UserFilter>({}); // Filtros UI
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Configuración de columnas para la tabla/skeleton ---
  const tableColumns: ColumnConfig[] = [
    { cell: { type: 'double', widthClass: 'w-3/4' } }, // Nombre/Email
    { cell: { type: 'text', widthClass: 'w-16' } },    // Rol
    { cell: { type: 'text', widthClass: 'w-20' } },    // Oficina
    { cell: { type: 'badge', widthClass: 'w-14' } },   // Estado
    { width: 'w-[50px]', cell: { type: 'action', align: 'right' }, header: { show: false } } // Acciones
  ];

  // --- Función applyUserFilters (Implementa tu lógica) ---
  const applyUserFilters = (allUsers: User[], currentFilters: UserFilter): User[] => {
    let filtered = [...allUsers];
    console.log("Filtering client-side users:", currentFilters, "on", allUsers.length, "users");

    if (currentFilters.username) {
      const searchLower = currentFilters.username.toLowerCase();
      filtered = filtered.filter(user =>
        (user.username?.toLowerCase() ?? '').includes(searchLower) ||
        (user.email?.toLowerCase() ?? '').includes(searchLower) ||
        (user.name?.toLowerCase() ?? '').includes(searchLower)
      );
    }
    if (currentFilters.role && currentFilters.role !== 'all') {
      filtered = filtered.filter(user => user.role?.toLowerCase() === currentFilters.role?.toLowerCase());
    }
    if (currentFilters.status && currentFilters.status !== 'all') {
      filtered = filtered.filter(user => user.status?.toLowerCase() === currentFilters.status?.toLowerCase());
    }
    if (currentFilters.office && currentFilters.office !== 'all') {
      filtered = filtered.filter(user => user.office ? user.office.toString().toLowerCase() === currentFilters.office?.toLowerCase() : false);
    }
    return filtered;
  };


  // --- Función para cargar usuarios (con Auth) ---
  const fetchUsers = useCallback(async () => {
    if (sessionStatus !== "authenticated" || !session?.accessToken || !session?.user?.officeId) {
      if (sessionStatus === "authenticated") { setError("Datos de sesión incompletos."); }
      setIsLoading(false); return;
    }
    const accessToken = session.accessToken;
    const userOffice = session.user.officeId;

    setIsLoading(true); setError(null);

    try {
      const endpoint = userType === 'internal' ? 'users' : 'external-users';
      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/${endpoint}`;
      console.log(`Workspaceing ${userType} users for office ${userOffice} from: ${url}`);

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
      });

      if (!response.ok) {
        let errorMsg = `Error al obtener ${userType} usuarios`;
        try { const errorData = await response.json(); errorMsg = errorData.message || errorMsg; } catch { }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      const fetchedUsers: User[] = Array.isArray(data) ? data : (data?.users || []);

      console.log(`Workspaceed ${fetchedUsers.length} ${userType} users for office ${userOffice}`);
      setUsers(fetchedUsers);

      // Aplica filtros inmediatamente después de recibir datos
      const currentlyFiltered = applyUserFilters(fetchedUsers, filters);
      setFilteredUsers(currentlyFiltered);

    } catch (error: unknown) {
      console.error(`Client error fetching ${userType} users:`, error);
      const message = error instanceof Error ? error.message : 'Error desconocido al cargar usuarios.';
      setError(message);
      setUsers([]); setFilteredUsers([]);
    } finally {
      setIsLoading(false);
    }
    // Dependencias corregidas
  }, [session, sessionStatus, userType, filters, setError]);


  // --- useEffect para Carga Inicial ---
  useEffect(() => {
    if (sessionStatus === "authenticated") { fetchUsers(); }
    else if (sessionStatus === "unauthenticated") { setIsLoading(false); setError("Necesitas iniciar sesión."); }
  }, [sessionStatus, fetchUsers]);


  // --- useEffect para RE-FILTRAR en cliente ---
  useEffect(() => {
    console.log("Applying client-side filters due to change in filters or base users...");
    const filtered = applyUserFilters(users, filters);
    setFilteredUsers(filtered);
  }, [filters, users]); // Depende de filtros y de la lista base 'users'


  // --- updateUser (con Auth y error handling) ---
  const updateUser = async (userId: string, userData: Partial<User>) => {
    if (sessionStatus !== "authenticated" || !session?.accessToken) {
      toast.error("Autenticación requerida para actualizar.");
      throw new Error("Authentication required");
    }
    const accessToken = session.accessToken;
    try {
      const endpoint = userType === 'internal' ? 'users' : 'external-users';
      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/${endpoint}/${userId}`;
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        let errorMsg = `Error al actualizar ${userType === 'internal' ? 'usuario' : 'usuario externo'}`;
        try { const errorData = await response.json(); errorMsg = errorData.message || errorMsg; } catch { }
        throw new Error(errorMsg);
      }
      const updatedUser = await response.json();
      const updateList = (list: User[]) => list.map(user => user.id === userId ? { ...user, ...updatedUser } : user);
      setUsers(updateList);
      // setFilteredUsers(updateList); // El useEffect [filters, users] se encargará
      toast.success("Usuario actualizado");
      return updatedUser;
    } catch (error: unknown) { // Corregido
      console.error(`Error updating ${userType} user:`, error);
      const message = error instanceof Error ? error.message : `Error al actualizar ${userType} usuario.`;
      toast.error(message);
      throw error; // Re-lanza para que el llamador sepa
    }
  };

  // --- Handlers de Filtros ---
  const handleFilterChange = (field: keyof UserFilter, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };
  const handleResetFilters = () => { setFilters({}); };


  // --- Definiciones JSX Completas ---

  const HeaderContent = () => (
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-x-2">
        <h2 className="text-xl font-semibold">
          {userType === 'internal' ? 'Usuarios Internos' : 'Usuarios Externos'}
        </h2>
        {session?.user?.officeId && ( // Usa officeId consistentemente
          <Badge variant="outline">Oficina: {session.user.officeId}</Badge>
        )}
      </div>
      {/* Asegúrate que CreateUserModal también envíe el token */}
      <CreateUserModal onUserCreated={fetchUsers} userType={userType} />
    </div>
  );

  const HeaderSkeleton = () => (
    <div className="flex justify-between items-center mb-6 animate-pulse">
      <div className="flex items-center gap-x-2">
        <Skeleton className="h-8 w-48 rounded" /> {/* Ajustado tamaño */}
        <Skeleton className="h-6 w-24 rounded" /> {/* Skeleton para Badge */}
      </div>
      <Skeleton className="h-10 w-40 rounded" /> {/* Skeleton para botón Crear */}
    </div>
  );

  const FiltersSkeleton = () => (
    <Card className="mb-4 p-6 space-y-6 animate-pulse">
      <div className="flex flex-col md:flex-row justify-between">
        <Skeleton className="h-5 w-20 mb-2 rounded" /> {/* Label Filtros */}
        <Skeleton className="h-8 w-28 rounded" /> {/* Botón Limpiar */}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"> {/* Ajustado a 4 filtros ejemplo */}
        <div className="space-y-1"><Skeleton className="h-4 w-24 rounded" /><Skeleton className="h-10 w-full rounded" /></div>
        <div className="space-y-1"><Skeleton className="h-4 w-24 rounded" /><Skeleton className="h-10 w-full rounded" /></div>
        <div className="space-y-1"><Skeleton className="h-4 w-24 rounded" /><Skeleton className="h-10 w-full rounded" /></div>
        <div className="space-y-1"><Skeleton className="h-4 w-24 rounded" /><Skeleton className="h-10 w-full rounded" /></div>
      </div>
    </Card>
  );
  // --- Fin Definiciones JSX ---


  // --- Renderizado Condicional y Principal ---
  if (sessionStatus === "loading") {
    return (
      <div className="container mx-auto py-6">
        <HeaderSkeleton />
        <FiltersSkeleton />
        <Card><TableSkeleton columns={tableColumns} rowCount={8} /></Card>
      </div>
    );
  }
  if (sessionStatus === "unauthenticated") {
    return <div className="container mx-auto py-6"><p>Necesitas iniciar sesión.</p></div>;
  }

  return (
    // Usa un div contenedor con padding si es necesario
    <div className="container mx-auto py-6">
      {/* Encabezado */}
      <SkeletonLoader skeleton={<HeaderSkeleton />} isLoading={isLoading && users.length === 0}>
        <HeaderContent />
      </SkeletonLoader>

      {/* Filtros */}
      <SkeletonLoader skeleton={<FiltersSkeleton />} isLoading={isLoading && users.length === 0}>
        {/* Renderiza filtros siempre que no esté en el estado de carga inicial sin datos */}
        {!(isLoading && users.length === 0) &&
          <UsersFilters onFilterChange={handleFilterChange} users={users} /* Pasa las props que necesite UsersFilters */ onReset={function (): void {
            throw new Error("Function not implemented.");
          }} /* Pasa las props que necesite UsersFilters */ />
        }
      </SkeletonLoader>

      {/* Tabla o Mensaje Error/Vacío */}
      <SkeletonLoader
        skeleton={<Card><TableSkeleton columns={tableColumns} rowCount={8} /></Card>}
        isLoading={isLoading && users.length === 0}
      >
        {error && !isLoading ? (
          <Card className="p-8 text-center my-4"><p className="text-red-500">{error}</p></Card>
        ) : !error && users.length > 0 && filteredUsers.length === 0 && !isLoading ? (
          <Card className="p-8 text-center my-4 border rounded-md"> <p className="text-lg text-muted-foreground mb-4">No se encontraron usuarios con los filtros actuales.</p> <Button variant="outline" onClick={handleResetFilters}>Limpiar Filtros</Button> </Card>
        ) : !error && users.length === 0 && !isLoading ? (
          <div className="flex flex-col justify-center items-center h-64 border rounded-md"> <p className="text-lg text-muted-foreground mb-4">No hay usuarios para mostrar en esta oficina</p> <p className="text-sm text-muted-foreground">Puedes crear uno nuevo.</p> </div>
        ) : !error ? (
          <UsersTable users={filteredUsers} onUpdateUser={updateUser} onRefreshUsers={fetchUsers} userType={userType} />
        ) : null
        }
      </SkeletonLoader>
    </div>
  );
}