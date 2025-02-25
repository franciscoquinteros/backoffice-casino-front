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
import { useState, useEffect } from "react"
import { EditUserModal } from "./edit-user-modal"
import { SessionsModal } from "./sessions-modal"
import { ChangePasswordModal } from "./change-password-modal"
import { DeleteUserModal } from "./delete-user-modal"
import { toast } from "sonner"

enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

enum WithdrawalStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled'
}

interface UsersTableProps {
  users: User[]
  onUpdateUser: (userId: string, userData: Partial<User>) => Promise<void>
  onRefreshUsers?: () => Promise<void>
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

export function UsersTable({ users, onRefreshUsers }: UsersTableProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [updatedUsers, setUpdatedUsers] = useState<User[]>([])

  useEffect(() => {
    if (users && users.length > 0) {
      setUpdatedUsers(users)
    }
  }, [users])

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
        withdrawal: updatedUser.receivesWithdrawals ? WithdrawalStatus.ENABLED : WithdrawalStatus.DISABLED,
        role: updatedUser.role,
        office: updatedUser.office
      }
            
      setUpdatedUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === selectedUser.id 
            ? { 
                ...user, 
                status: userData.status || user.status,
                receivesWithdrawals: updatedUser.receivesWithdrawals !== undefined 
                  ? updatedUser.receivesWithdrawals 
                  : user.receivesWithdrawals,
                role: userData.role || user.role,
                office: userData.office || user.office
              } 
            : user
        )
      )
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
      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/users/${selectedUser.id}/password`
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
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
    
    setIsLoading(true)
    try {
      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/users/${selectedUser.id}`
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Error al eliminar usuario: ${response.statusText}`)
      }
      
      setUpdatedUsers(prevUsers => 
        prevUsers.filter(user => user.id !== selectedUser.id)
      )
      
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

  const usersToDisplay = updatedUsers.length > 0 ? updatedUsers : users

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
            {!usersToDisplay || usersToDisplay.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">No hay usuarios</TableCell>
              </TableRow>
            ) : (
              usersToDisplay.map((user) => (
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
                  <TableCell>{user.role}</TableCell>
                  <TableCell>{user.office}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusDisplay(user.status).className
                      }`}>
                      {getStatusDisplay(user.status).label}
                    </span>
                  </TableCell>
                  <TableCell>
                    {user.receivesWithdrawals ? 'Recibe' : 'No recibe'}
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
                        <DropdownMenuItem 
                          onClick={() => handleDeleteUser(user)}
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                          <Trash2Icon className="mr-2 h-4 w-4" />
                          <span>Eliminar usuario</span>
                        </DropdownMenuItem>
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
          />
        </>
      )}
    </>
  )
} 