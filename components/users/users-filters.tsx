"use client"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useMemo } from "react"
import { User } from "@/types/user"
import { useOffices } from "@/components/hooks/use-offices"
import { useAuth } from "@/hooks/useAuth"

interface UsersFiltersProps {
  onFilterChange: (field: string, value: string) => void
  users: User[]
}

export function UsersFilters({ onFilterChange, users }: UsersFiltersProps) {
  // Usamos el hook para obtener las oficinas
  const { getOfficeName } = useOffices()
  
  // Obtenemos información del usuario actual
  const { isSuperAdmin } = useAuth()

  // Roles predefinidos para asegurar que siempre estén disponibles
  const predefinedRoles = ['administrador', 'encargado', 'operador', 'superadmin'];
  
  // Estados predefinidos según el backend
  const predefinedStatuses = ['active', 'inactive'];
  
  // Mapeo de estados a nombres en español
  const statusLabels: Record<string, string> = {
    'active': 'Activo',
    'inactive': 'Inactivo'
  };

  // Get unique normalized values for each filter
  const filterOptions = useMemo(() => {
    const getUniqueValues = (field: keyof User) => {
      const values = new Set<string>()
      
      if (users && users.length > 0) {
        users.forEach(user => {
          if (user[field] !== undefined && user[field] !== null) {
            const value = String(user[field]).toLowerCase()
            values.add(value)
          }
        })
      }
      
      return Array.from(values).sort()
    }

    // Para office, usamos los valores únicos de los usuarios
    const uniqueOffices = getUniqueValues('office');

    return {
      roles: predefinedRoles, // Usamos roles predefinidos
      offices: uniqueOffices,
      statuses: predefinedStatuses // Usamos estados predefinidos
    }
  }, [users])
  
  // Helper to capitalize first letter
  const capitalize = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  // Manejador del cambio en el input de búsqueda
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    onFilterChange('username', value);
  }

  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <Input
        placeholder="Buscar por usuario..."
        className="max-w-xs"
        onChange={handleSearchChange}
      />
      <Select onValueChange={(value: string) => onFilterChange('role', value)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filtrar por rol" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los roles</SelectItem>
          {filterOptions.roles.map(role => (
            <SelectItem key={role} value={role}>
              {capitalize(role)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select onValueChange={(value: string) => onFilterChange('status', value)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filtrar por estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          {filterOptions.statuses.map(status => (
            <SelectItem key={status} value={status}>
              {statusLabels[status] || capitalize(status)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isSuperAdmin && (
        <Select onValueChange={(value: string) => onFilterChange('office', value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por oficina" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las oficinas</SelectItem>
            {filterOptions.offices.map(officeId => (
              <SelectItem key={officeId} value={officeId}>
                {officeId === "remote" ? "Remoto" : getOfficeName(officeId)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}