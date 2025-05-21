"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

// Tipos requeridos
export interface User {
    id: string | number;
    username: string;
    email: string;
    role: string;
    status: string;
    office: string;
    createdAt?: Date | string;
    lastLoginDate?: Date | string | null;
    phoneNumber?: string;
    description?: string;
    withdrawal?: string;
    // Propiedades opcionales específicas
    firstName?: string;
    lastName?: string;
    profileImage?: string;
    isActive?: boolean;
    officeId?: string;
    permissions?: string[];
    updatedAt?: Date | string;
}

export interface UserFilters {
    officeId?: string | null;
    role?: string | null;
    status?: string | null;
    search?: string | null;
}

export function useAllUsers(filters: UserFilters = {}) {
    const { data: session } = useSession();
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Función para obtener todos los usuarios de todas las oficinas
    const fetchAllUsers = useCallback(async () => {
        if (!session?.accessToken) {
            setError('No hay sesión activa');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            console.log('Fetching users with token:', session.accessToken);
            // Endpoint para superadmin que devuelve usuarios de todas las oficinas
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/users/all`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            setUsers(data);
            setError(null);
        } catch (err) {
            console.error('Error al obtener usuarios:', err);
            setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
            setUsers([]);
        } finally {
            setIsLoading(false);
        }
    }, [session?.accessToken]);

    // Efecto para cargar usuarios al inicio
    useEffect(() => {
        if (session?.accessToken) {
            fetchAllUsers();
        }
    }, [session?.accessToken, fetchAllUsers]);

    // Función para aplicar filtros a los usuarios
    const applyFilters = useCallback(() => {
        let result = [...users];

        // Filtrar por oficina
        if (filters.officeId) {
            result = result.filter(user => user.office === filters.officeId);
        }

        // Filtrar por rol
        if (filters.role) {
            result = result.filter(user => user.role === filters.role);
        }

        // Filtrar por estado (active, inactive, etc)
        if (filters.status) {
            result = result.filter(user => user.status === filters.status);
        }

        // Búsqueda de texto
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            result = result.filter(user =>
                (user.username?.toLowerCase().includes(searchLower)) ||
                (user.email?.toLowerCase().includes(searchLower)) ||
                (user.phoneNumber?.toLowerCase().includes(searchLower)) ||
                (user.description?.toLowerCase().includes(searchLower))
            );
        }

        setFilteredUsers(result);
    }, [users, filters]);

    // Efecto para aplicar filtros cuando cambian los filtros o los usuarios
    useEffect(() => {
        applyFilters();
    }, [filters, users, applyFilters]);

    return {
        allUsers: users,
        filteredUsers,
        isLoading,
        error,
        refetch: fetchAllUsers
    };
} 