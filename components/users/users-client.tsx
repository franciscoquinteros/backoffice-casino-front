"use client"

import { useState, useEffect } from "react"
import { UsersTable } from "./users-table"
import { UsersFilters } from "./users-filters"
import { User } from "@/types/user"
import { CreateUserModal } from "@/app/dashboard/users/create-user-modal"
import { SkeletonLoader } from "@/components/skeleton-loader"
import { Skeleton } from "@/components/ui/skeleton"
import { TableSkeleton, type ColumnConfig } from '@/components/ui/table-skeleton'

interface UsersClientProps {
  initialUsers: User[]
  userType: 'internal' | 'external'
}

export function UsersClient({ initialUsers, userType }: UsersClientProps) {
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Configuración de columnas para la tabla de usuarios
  const tableColumns: ColumnConfig[] = [
    { cell: { type: 'double', widthClass: 'w-3/4' } }, // Nombre/Email
    { cell: { type: 'text', widthClass: 'w-16' } },    // Rol
    { cell: { type: 'text', widthClass: 'w-20' } },    // Oficina
    { cell: { type: 'badge', widthClass: 'w-14' } },   // Estado
    { width: 'w-[50px]', cell: { type: 'action', align: 'right' }, header: { show: false } } // Acciones
  ]

  // Skeleton para los filtros
  const FiltersSkeleton = (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="flex-1">
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="flex-1">
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="flex-1">
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="flex-1">
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )

  // Efecto para cargar los datos iniciales
  useEffect(() => {
    if (initialUsers && initialUsers.length > 0) {
      setUsers(initialUsers)
      setFilteredUsers(initialUsers)
      // Establecemos un tiempo pequeño para permitir que se muestre el skeleton
      const timer = setTimeout(() => {
        setIsLoading(false)
      }, 800)

      return () => clearTimeout(timer)
    }
  }, [initialUsers])

  const refreshUsers = async () => {
    try {
      setIsLoading(true)
      // Usamos un endpoint diferente según el tipo de usuario
      const endpoint = userType === 'internal' ? 'users' : 'external-users'
      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/${endpoint}`

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
        setFilteredUsers(data)
      } else {
        console.error(`Client error fetching ${userType} users:`, response.status, response.statusText)
      }
    } catch (error) {
      console.error(`Client error fetching ${userType} users:`, error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateUser = async (userId: string, userData: Partial<User>) => {
    try {
      // Usamos un endpoint diferente según el tipo de usuario
      const endpoint = userType === 'internal' ? 'users' : 'external-users'
      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/${endpoint}/${userId}`

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      if (response.ok) {
        const updatedUser = await response.json()
        // Update the local state with the updated user
        setUsers(prevUsers =>
          prevUsers.map(user => user.id === userId ? { ...user, ...updatedUser } : user)
        )
        setFilteredUsers(prevFiltered =>
          prevFiltered.map(user => user.id === userId ? { ...user, ...updatedUser } : user)
        )
        return updatedUser
      } else {
        console.error(`Error updating ${userType} user:`, response.status, response.statusText)
        throw new Error(`Error updating user: ${response.statusText}`)
      }
    } catch (error) {
      console.error(`Error updating ${userType} user:`, error)
      throw error
    }
  }

  const handleFilterChange = (field: string, value: string) => {
    // Si no hay valor o si es 'all', no aplicamos filtro
    if (!value || value === 'all') {
      setFilteredUsers([...users]);
      return;
    }

    // Aplicamos el filtro
    const filtered = users.filter(user => {
      if (!user) return false;
      
      // Normalizamos los valores para comparación
      const filterValue = value.toLowerCase();
      
      switch (field) {
        case 'username':
          return user.username?.toLowerCase().includes(filterValue) || false;
        case 'role':
          return user.role?.toLowerCase() === filterValue || false;
        case 'status':
          return user.status?.toLowerCase() === filterValue || false;
        case 'office':
          return user.office ? String(user.office).toLowerCase() === filterValue : false;
        default:
          return true;
      }
    });
    
    setFilteredUsers(filtered);
  }

  // Header con título y botón de crear
  const HeaderContent = (
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-xl font-semibold">
        {userType === 'internal' ? 'Usuarios Internos' : 'Usuarios Externos'}
      </h2>
      <CreateUserModal
        onUserCreated={refreshUsers}
        userType={userType}
      />
    </div>
  )

  // Skeleton del header
  const HeaderSkeleton = (
    <div className="flex justify-between items-center mb-6">
      <Skeleton className="h-7 w-64" />
    </div>
  )

  return (
    <>
      {/* Header con título y botón de crear */}
      <SkeletonLoader
        skeleton={HeaderSkeleton}
        isLoading={isLoading}
      >
        {HeaderContent}
      </SkeletonLoader>

      {/* Filtros */}
      <SkeletonLoader
        skeleton={FiltersSkeleton}
        isLoading={isLoading}
      >
        <UsersFilters onFilterChange={handleFilterChange} users={users} />
      </SkeletonLoader>

      {/* Tabla de usuarios */}
      <SkeletonLoader
        skeleton={<TableSkeleton columns={tableColumns} rowCount={8} />}
        isLoading={isLoading}
      >
        <UsersTable
          users={filteredUsers}
          onUpdateUser={updateUser}
          onRefreshUsers={refreshUsers}
          userType={userType}
        />
      </SkeletonLoader>
    </>
  )
}