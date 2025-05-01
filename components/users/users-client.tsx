// Ruta Ejemplo: app/dashboard/users/users-client.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { UsersTable } from "./users-table"; // Ajusta ruta
import { UsersFilters } from "./users-filters"; // Ajusta ruta
import { User } from "@/types/user"; // Ajusta ruta
import { CreateUserModal } from "@/app/dashboard/users/create-user-modal"; // Ajusta ruta
import { SkeletonLoader } from "@/components/skeleton-loader"; // Ajusta ruta
import { Skeleton } from "@/components/ui/skeleton"; // Ajusta ruta
import { TableSkeleton, type ColumnConfig } from '@/components/ui/table-skeleton'; // Ajusta ruta
import { toast } from 'sonner';
import { Card } from "../ui/card";
// Importa Badge si quieres usarlo para la oficina
// import { Badge } from "@/components/ui/badge";

interface UsersClientProps {
  userType: 'internal' | 'external';
}

export function UsersClient({ userType }: UsersClientProps) {
  const { data: session, status: sessionStatus } = useSession();

  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
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

  // --- Función para cargar usuarios (con Auth) ---
  const fetchUsers = useCallback(async () => {
    // No usamos showLoadingState aquí, manejamos isLoading globalmente
    if (sessionStatus !== "authenticated" || !session?.accessToken || !session?.user?.officeId) { // Asumiendo que 'office' es el campo en session.user
      console.log("Fetch Users prevented: Session not ready or missing data.", { sessionStatus });
      if (sessionStatus === "authenticated") { setError("Datos de sesión incompletos."); }
      setIsLoading(false); // Importante: detener carga si no hay sesión
      return;
    }
    const accessToken = session.accessToken;
    const userOffice = session.user.officeId; // Oficina del usuario logueado

    setIsLoading(true); // Inicia carga
    setError(null); // Limpia errores

    try {
      const endpoint = userType === 'internal' ? 'users' : 'external-users';
      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/${endpoint}`;
      // Asumiendo que el backend filtra por token, no añadimos query param
      console.log(`Workspaceing ${userType} users for office ${userOffice} from: ${url}`);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        let errorMsg = `Error al obtener ${userType} usuarios`;
        try { const errorData = await response.json(); errorMsg = errorData.message || errorMsg; } catch (e) { }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      const fetchedUsers: User[] = Array.isArray(data) ? data : (data?.users || []); // Ajusta según tu API

      console.log(`Workspaceed ${fetchedUsers.length} ${userType} users for office ${userOffice}`);
      setUsers(fetchedUsers);
      setFilteredUsers(fetchedUsers); // Inicialmente, filtrados = todos

    } catch (_error) {
      console.error(`Client error fetching ${userType} users:`, error);
      setUsers([]); // Limpia datos en caso de error
      setFilteredUsers([]);
    } finally {
      setIsLoading(false); // Termina carga
    }
  }, [session, sessionStatus, userType]);

  // --- useEffect para Carga Inicial ---
  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchUsers(); // Llama a cargar datos cuando la sesión está lista
    } else if (sessionStatus === "unauthenticated") {
      setIsLoading(false);
      setError("Necesitas iniciar sesión.");
    }
    // Si está 'loading', espera
  }, [sessionStatus, fetchUsers]); // Se ejecuta cuando cambia el status o la función fetch


  // --- updateUser (con Auth) ---
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
        try { const errorData = await response.json(); errorMsg = errorData.message || errorMsg; } catch (e) { }
        throw new Error(errorMsg);
      }
      const updatedUser = await response.json();
      const updateList = (list: User[]) => list.map(user => user.id === userId ? { ...user, ...updatedUser } : user);
      setUsers(updateList);
      setFilteredUsers(updateList);
      toast.success("Usuario actualizado");
      return updatedUser;
    } catch (_error) {
      console.error(`Error updating ${userType} user:`, error);
      throw error;
    }
  };

  // --- handleFilterChange (Client-side, sin cambios) ---
  const handleFilterChange = (field: string, value: string) => {
    if (!value || value === 'all') {
      setFilteredUsers([...users]); return;
    }
    const filtered = users.filter(user => {
      if (!user) return false;
      const filterValue = value.toLowerCase();
      switch (field) {
        case 'username': return user.username?.toLowerCase().includes(filterValue) || false;
        case 'role': return user.role?.toLowerCase() === filterValue || false;
        case 'status': return user.status?.toLowerCase() === filterValue || false;
        case 'office': return user.office ? String(user.office).toLowerCase() === filterValue : false;
        default: return true;
      }
    });
    setFilteredUsers(filtered);
  };

  // --- Definiciones JSX ---

  // Header con título, etiqueta de oficina y botón de crear
  const HeaderContent = (
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-x-2">
        <h2 className="text-xl font-semibold">
          {userType === 'internal' ? 'Usuarios Internos' : 'Usuarios Externos'}
        </h2>
        {/* Muestra la oficina del usuario logueado */}
        {session?.user?.officeId && (
          <span className="text-base font-normal text-muted-foreground">
            (Oficina: {session.user.officeId})
          </span>
          // O usa: <Badge variant="secondary">Oficina: {session.user.office}</Badge>
        )}
      </div>
      {/* TODO: CreateUserModal también necesitará pasar el token al backend */}
      <CreateUserModal onUserCreated={fetchUsers} userType={userType} />
    </div>
  );

  // Skeleton del header
  const HeaderSkeleton = (
    <div className="flex justify-between items-center mb-6">
      <Skeleton className="h-7 w-64" /> {/* Skeleton para el título */}
      <Skeleton className="h-10 w-32" /> {/* Skeleton para el botón Crear */}
    </div>
  );

  // Skeleton para los filtros
  const FiltersSkeleton = (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="flex-1"><Skeleton className="h-10 w-full" /></div>
      <div className="flex-1"><Skeleton className="h-10 w-full" /></div>
      <div className="flex-1"><Skeleton className="h-10 w-full" /></div>
      <div className="flex-1"><Skeleton className="h-10 w-full" /></div>
    </div>
  );

  // --- Fin Definiciones JSX ---


  // --- Renderizado Condicional por Sesión ---
  if (sessionStatus === "loading") {
    return (
      <div className="container mx-auto py-6">
        {HeaderSkeleton}
        {FiltersSkeleton}
        <TableSkeleton columns={tableColumns} rowCount={8} />
      </div>
    );
  }
  if (sessionStatus === "unauthenticated") {
    return <div className="container mx-auto py-6"><p>Necesitas iniciar sesión para ver los usuarios.</p></div>;
  }
  // --- Fin Renderizado Condicional por Sesión ---


  // --- Renderizado Principal ---
  return (
    <>
      {/* Encabezado */}
      <SkeletonLoader skeleton={HeaderSkeleton} isLoading={isLoading && users.length === 0}>
        {HeaderContent}
      </SkeletonLoader>

      {/* Filtros */}
      <SkeletonLoader skeleton={FiltersSkeleton} isLoading={isLoading && users.length === 0}>
        {/* Solo muestra filtros si hay usuarios base para filtrar */}
        {users.length > 0 || !isLoading ? ( // Muestra si hay usuarios o si ya terminó de cargar (incluso si no hay usuarios)
          <UsersFilters onFilterChange={handleFilterChange} users={users} />
        ) : null}
      </SkeletonLoader>

      {/* Tabla o Mensaje de Error/Vacío */}
      <SkeletonLoader
        skeleton={<TableSkeleton columns={tableColumns} rowCount={8} />}
        isLoading={isLoading && users.length === 0} // Muestra skeleton solo en carga inicial sin datos
      >
        {error && !isLoading ? ( // Muestra error si existe y no está cargando
          <Card className="p-8 text-center my-4"><p className="text-red-500">{error}</p></Card>
        ) : !error && users.length === 0 && !isLoading ? ( // Muestra "No hay usuarios" si no hay error, no carga y no hay datos
          <div className="flex flex-col justify-center items-center h-64 border rounded-md">
            <p className="text-lg text-muted-foreground mb-4">No hay usuarios para mostrar</p>
            <p className="text-sm text-muted-foreground">Crea un nuevo usuario usando el botón correspondiente</p>
          </div>
        ) : !error ? ( // Si no hay error, muestra la tabla (puede estar vacía si filteredUsers está vacío)
          <UsersTable
            users={filteredUsers} // Muestra los usuarios filtrados
            onUpdateUser={updateUser}
            onRefreshUsers={fetchUsers} // Pasa la función de refresco
            userType={userType}
          />
        ) : null // No muestra nada más si hay error (ya se mostró arriba)
        }
      </SkeletonLoader>
    </>
  );
}