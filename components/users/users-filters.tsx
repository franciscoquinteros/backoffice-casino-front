// components/users/users-filters.tsx

import React, { useState } from 'react'; // Asegúrate de importar React si usas useState/JSX
// --- Importa UserFilter desde tu archivo central ---
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { UserFilter } from './users-client';
import { User } from '@/types/user';

// --- CORRIGE LA INTERFAZ DE PROPS ---
interface UsersFiltersProps {
  // Cambia 'field: string' a 'field: keyof UserFilter'
  onFilterChange: (field: keyof UserFilter, value: string) => void; // <-- CORREGIDO
  onReset: () => void;
  users: User[]; // Para extraer opciones de Selects si es necesario
}
// --- FIN CORRECCIÓN INTERFAZ ---

export function UsersFilters({ onFilterChange, onReset, users }: UsersFiltersProps) {
  // Estados internos para controlar los valores de los inputs/selects
  // Inicialízalos para que coincidan con el estado 'filters' del padre si es necesario,
  // o maneja el valor directamente con la prop si prefieres un componente controlado.
  // Ejemplo con estado interno:
  const [internalSearch, setInternalSearch] = useState('');
  const [internalStatus, setInternalStatus] = useState('all');
  const [internalRole, setInternalRole] = useState('all');
  const [internalOffice, setInternalOffice] = useState('all');

  // Extraer opciones únicas para los Select (ejemplo)
  const uniqueRoles = Array.from(new Set(users.map(u => u.role).filter(Boolean)));
  const uniqueOffices = Array.from(new Set(users.map(u => u.office?.toString()).filter(Boolean)));

  // Handlers internos que llaman a onFilterChange con la clave correcta
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>, field: keyof UserFilter) => {
    const value = event.target.value;
    // Actualiza estado interno si lo usas
    if (field === 'username') setInternalSearch(value);
    // Llama al padre
    onFilterChange(field, value);
  };

  const handleSelectChange = (value: string, field: keyof UserFilter) => {
    // Actualiza estado interno si lo usas
    if (field === 'status') setInternalStatus(value);
    if (field === 'role') setInternalRole(value);
    if (field === 'office') setInternalOffice(value);
    // Llama al padre
    onFilterChange(field, value);
  };

  const handleInternalReset = () => {
    // Resetea estado interno
    setInternalSearch('');
    setInternalStatus('all');
    setInternalRole('all');
    setInternalOffice('all');
    // Llama al padre
    onReset();
  };


  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filtros</CardTitle>
          <Button variant="ghost" size="sm" onClick={handleInternalReset} className="h-8 gap-1"> <X className="h-4 w-4" /> Limpiar </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end">
          {/* Búsqueda (asume que usa el campo 'username' del filtro) */}
          <div className="space-y-1">
            <Label htmlFor="user-search">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="user-search"
                placeholder="Buscar por nombre, email o usuario..."
                value={internalSearch}
                onChange={(e) => handleInputChange(e, 'username')}
                className="pl-8"
              />
            </div>
          </div>
          {/* Rol */}
          <div className="space-y-1">
            <Label htmlFor="role-filter">Rol</Label>
            <Select value={internalRole} onValueChange={(value) => handleSelectChange(value, 'role')}>
              <SelectTrigger id="role-filter"><SelectValue placeholder="Rol" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {/* Opciones de roles (pueden ser dinámicas o fijas) */}
                {uniqueRoles.map(role => <SelectItem key={role} value={role!}>{role}</SelectItem>)}
                {/* O fijas: <SelectItem value="admin">Admin</SelectItem> */}
              </SelectContent>
            </Select>
          </div>
          {/* Estado */}
          <div className="space-y-1">
            <Label htmlFor="status-filter">Estado</Label>
            <Select value={internalStatus} onValueChange={(value) => handleSelectChange(value, 'status')}>
              <SelectTrigger id="status-filter"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Oficina */}
          <div className="space-y-1">
            <Label htmlFor="office-filter">Oficina</Label>
            <Select value={internalOffice} onValueChange={(value) => handleSelectChange(value, 'office')}>
              <SelectTrigger id="office-filter"><SelectValue placeholder="Oficina" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {/* Opciones de oficina (pueden ser dinámicas de 'users') */}
                {uniqueOffices.map(office => <SelectItem key={office} value={office!}>{office}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* ... otros filtros ... */}
        </div>
      </CardContent>
    </Card>
  );
}