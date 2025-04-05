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

interface UsersFiltersProps {
  onFilterChange: (field: string, value: string) => void
  users: User[]
}

export function UsersFilters({ onFilterChange, users }: UsersFiltersProps) {
  // Usamos el hook para obtener las oficinas
  const { getOfficeName } = useOffices()

  // Roles predefinidos para asegurar que siempre estén disponibles
  const predefinedRoles = ['administrador', 'encargado', 'operador'];

  // Get unique normalized values for each filter
  const filterOptions = useMemo(() => {
    const getUniqueValues = (field: keyof User) => {
      let values = new Set<string>()
      if(users.length > 0){
        values = new Set(users.map(user => user[field]?.toString().toLowerCase() ?? ''))
      }
      return Array.from(values).sort()
    }

    // Para status y office, usamos los valores únicos de los usuarios
    const uniqueStatuses = getUniqueValues('status');
    const uniqueOffices = getUniqueValues('office');

    return {
      roles: predefinedRoles, // Usamos roles predefinidos
      offices: uniqueOffices,
      statuses: uniqueStatuses
    }
  }, [users])

  // Helper to capitalize first letter
  const capitalize = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }
  
  // Get office display name based on ID
  const getOfficeDisplayName = (officeId: string) => {
    if (officeId === "remote") return "Remoto";
    return getOfficeName(officeId);
  }

  // Manejador del cambio en el input de búsqueda
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    onFilterChange('username', value); // Cambiado de 'name' a 'username'
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
              {capitalize(status)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select onValueChange={(value: string) => onFilterChange('office', value)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filtrar por oficina" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las oficinas</SelectItem>
          {filterOptions.offices.map(office => (
            <SelectItem key={office} value={office}>
              {getOfficeDisplayName(office)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}