"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { PencilIcon, History, MoreHorizontal, KeyIcon, Trash2Icon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { User } from "@/types/user"
import { useState } from "react"
import { EditUserModal } from "./edit-user-modal"
import { SessionsModal } from "./sessions-modal"
import { ChangePasswordModal } from "./change-password-modal"
import { DeleteUserModal } from "./delete-user-modal"
import { toast } from "sonner"
import { useOffices } from "@/components/hooks/use-offices"
import { useSession, getSession } from "next-auth/react"
import { useAuth } from "@/hooks/useAuth"

enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

interface UsersTableProps {
  users: User[]
  onUpdateUser: (userId: string, userData: Partial<User>) => Promise<void>
  onRefreshUsers?: () => Promise<void>
  userType?: 'internal' | 'external' // Añadimos esta propiedad
}

function getStatusDisplay(status: string) {
  const normalizedStatus = status.toLowerCase()
  if (['active', 'activo'].includes(normalizedStatus)) {
    return {
      label: 'Activo',
      className: 'bg-green-100 text-green-800'
    }
  }
  if (['inactive', 'inactivo'].includes(normalizedStatus)) {
    return {
      label: 'Inactivo',
      className: 'bg-red-100 text-red-800'
    }
  }
  return {
    label: status,
    className: 'bg-gray-100 text-gray-800'
  }
}

// Función para formatear los roles
function formatRole(role: string): string {
  if (!role) return '';

  const roleMap: Record<string, string> = {
    'superadmin': 'Super Administrador',
    'admin': 'Administrador',
    'administrador': 'Administrador',
    'user': 'Usuario',
    'viewer': 'Visualizador',
    'client': 'Cliente',
    'encargado': 'Encargado',
    'operador': 'Operador'
  };

  return roleMap[role.toLowerCase()] || role.charAt(0).toUpperCase() + role.slice(1);
}

export function UsersTable({ users, onUpdateUser, onRefreshUsers, userType = 'internal' }: UsersTableProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { data: session } = useSession()
  const { isAdmin, isSuperAdmin } = useAuth()

  // Usamos el hook de oficinas para obtener la función de mapeo de ID a nombre
  const { getOfficeName } = useOffices()

  // Función para verificar si se puede eliminar un usuario
  const canDeleteUser = (user: User): boolean => {
    // Los superadmins pueden eliminar cualquier usuario
    if (isSuperAdmin) return true

    // Los admins NO pueden eliminar superadmins
    if (isAdmin && user.role === 'superadmin') return false

    // Otros roles pueden eliminar según sus permisos normales
    return true
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setIsEditModalOpen(true)
    setOpenDropdownId(null)
  }

  const handleViewSessions = (user: User) => {
    setSelectedUser(user)
    setIsSessionsModalOpen(true)
    setOpenDropdownId(null)
  }

  const handleChangePassword = (user: User) => {
    setSelectedUser(user)
    setIsPasswordModalOpen(true)
    setOpenDropdownId(null)
  }

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user)
    setIsDeleteModalOpen(true)
    setOpenDropdownId(null)
  }

  const handleSaveUser = async (updatedUser: Partial<User> & { isActive?: boolean }) => {
    if (!selectedUser) return

    setIsLoading(true)
    try {
      const userData: Partial<User> = {
        status: updatedUser.isActive ? UserStatus.ACTIVE : UserStatus.INACTIVE,
        withdrawal: updatedUser.withdrawal,
        role: updatedUser.role,
        office: updatedUser.office
      }

      // Enviamos los datos al servidor
      await onUpdateUser(selectedUser.id, userData)

      // Si tenemos una función para refrescar los usuarios, la llamamos
      if (onRefreshUsers) {
        await onRefreshUsers()
      }

      setIsEditModalOpen(false)

      setTimeout(() => {
        toast.success('Usuario actualizado correctamente')
      }, 100)
    } catch (error) {
      console.error('Error al actualizar usuario:', error)
      setTimeout(() => {
        toast.error('Error al actualizar usuario')
      }, 100)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSavePassword = async (password: string) => {
    if (!selectedUser) return

    setIsLoading(true)
    try {
      // Get fresh session with getSession()
      const freshSession = await getSession();

      // Usar el endpoint correcto según el tipo de usuario
      const endpoint = userType === 'external' ? 'external-users' : 'users'
      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/${endpoint}/${selectedUser.id}/password`

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${freshSession?.accessToken}`
        },
        body: JSON.stringify({ password })
      })

      if (!response.ok) {
        throw new Error(`Error al actualizar contraseña: ${response.statusText}`)
      }

      setIsPasswordModalOpen(false)

      setTimeout(() => {
        toast.success('Contraseña actualizada correctamente')
      }, 100)
    } catch (error) {
      console.error('Error al actualizar contraseña:', error)
      setTimeout(() => {
        toast.error('Error al actualizar contraseña')
      }, 100)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedUser) return

    // Add extensive debug logs right at the beginning
    console.log("========== DELETE USER DEBUG ==========");
    console.log("1. Function started with user:", selectedUser);
    console.log("2. Current session from useSession:", session);

    // Try to get a fresh session
    const freshSession = await getSession();
    console.log("3. Fresh session from getSession():", freshSession);

    setIsLoading(true)
    try {
      console.log("4. Session data during delete:", {
        isAuthenticated: !!freshSession,
        hasToken: !!freshSession?.accessToken,
        userRole: freshSession?.user?.role,
        tokenLength: freshSession?.accessToken?.length,
        token: freshSession?.accessToken // Actually log the token for debugging
      });

      // Usar el endpoint correcto según el tipo de usuario
      const endpoint = userType === 'external' ? 'external-users' : 'users'
      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/${endpoint}/${selectedUser.id}`
      console.log("5. DELETE request URL:", url);

      // Use a regular fetch with manual Authorization header
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${freshSession?.accessToken}`
      };
      console.log("6. Request headers:", headers);

      const response = await fetch(url, {
        method: 'DELETE',
        headers
      });

      // Debug response
      console.log("7. Delete response status:", response.status);
      console.log("8. Response headers:", [...response.headers.entries()]);

      try {
        const responseText = await response.text();
        console.log("9. Response body:", responseText);
      } catch (e) {
        console.log("9. Could not read response body:", e);
      }

      if (!response.ok) {
        // Intentar obtener el mensaje de error del servidor
        let errorMessage = `Error al eliminar usuario: ${response.statusText}`;
        try {
          const errorData = await response.text();
          if (errorData) {
            // Si es el error específico de admin vs superadmin, mostrar mensaje claro
            if (errorData.includes('Admin users cannot delete superadmin users')) {
              errorMessage = 'No tienes permisos para eliminar usuarios superadministradores';
            } else {
              errorMessage = errorData;
            }
          }
        } catch {
          // Si no se puede leer el error, usar el mensaje genérico
        }
        throw new Error(errorMessage);
      }

      // Si tenemos una función para refrescar los usuarios, la llamamos
      if (onRefreshUsers) {
        await onRefreshUsers()
      }

      setIsDeleteModalOpen(false)

      setTimeout(() => {
        toast.success('Usuario eliminado correctamente')
      }, 100)
    } catch (error) {
      console.error('Error al eliminar usuario:', error)
      setTimeout(() => {
        toast.error('Error al eliminar usuario')
      }, 100)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Oficina</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Retiros</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!users || users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">No hay usuarios</TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.username}</p>
                      <p className="text-sm text-muted-foreground">
                        Creado: {new Intl.DateTimeFormat(undefined, {
                          dateStyle: 'medium',
                          timeZone: 'UTC'
                        }).format(new Date(user.createdAt))}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{formatRole(user.role)}</TableCell>
                  <TableCell>{getOfficeName(user.office)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusDisplay(user.status).className
                      }`}>
                      {getStatusDisplay(user.status).label}
                    </span>
                  </TableCell>
                  <TableCell>
                    {user.withdrawal === 'enabled' ? 'Habilitado' : 'Deshabilitado'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu open={openDropdownId === user.id} onOpenChange={(open) => {
                      setOpenDropdownId(open ? user.id : null)
                    }}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Abrir menú</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditUser(user)}>
                          <PencilIcon className="mr-2 h-4 w-4" />
                          <span>Editar</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewSessions(user)}>
                          <History className="mr-2 h-4 w-4" />
                          <span>Ver sesiones</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleChangePassword(user)}>
                          <KeyIcon className="mr-2 h-4 w-4" />
                          <span>Cambiar contraseña</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {canDeleteUser(user) ? (
                          <DropdownMenuItem
                            onClick={() => handleDeleteUser(user)}
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                          >
                            <Trash2Icon className="mr-2 h-4 w-4" />
                            <span>Eliminar usuario</span>
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            disabled
                            className="text-gray-400 cursor-not-allowed"
                            title={isAdmin && user.role === 'superadmin' ? 'Los administradores no pueden eliminar superadministradores' : 'No tienes permisos para eliminar este usuario'}
                          >
                            <Trash2Icon className="mr-2 h-4 w-4" />
                            <span>Eliminar usuario</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedUser && (
        <>
          <EditUserModal
            user={selectedUser}
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSave={handleSaveUser}
            isLoading={isLoading}
          />
          <SessionsModal
            user={selectedUser}
            isOpen={isSessionsModalOpen}
            onClose={() => setIsSessionsModalOpen(false)}
          />
          <ChangePasswordModal
            user={selectedUser}
            isOpen={isPasswordModalOpen}
            onClose={() => setIsPasswordModalOpen(false)}
            onSave={handleSavePassword}
            isLoading={isLoading}
          />
          <DeleteUserModal
            user={selectedUser}
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={handleConfirmDelete}
            isLoading={isLoading}
            currentUserRole={session?.user?.role ?? undefined}
          />
        </>
      )}
    </>
  )
}