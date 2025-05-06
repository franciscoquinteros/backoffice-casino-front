// Ejemplo: components/layout/office-selector.tsx
"use client";

import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import useSWR from 'swr';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';

// Interfaz para la respuesta de la API de oficinas
interface OfficeOption {
    id: number | string;
    name: string;
}

// Fetcher simple para SWR
const fetcher = async ([url, token]: [string, string | undefined]) => { // <-- Destructura el array [url, token]
    // Verifica si el token existe (SWR no debería llamar si es null, pero es buena práctica)
    if (!token) {
        console.error("Fetcher llamado sin token.");
        throw new Error('Authentication token is required for fetcher');
    }
    // La URL base ahora viene de la clave, no hace falta añadirla aquí
    // const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    console.log(`[Fetcher] Calling: ${url}`); // Loguea solo la URL correcta

    const response = await fetch(url, { // Usa la URL del array
        headers: {
            'Authorization': `Bearer ${token}` // <-- Usa el token del array en el header
            // 'Accept': 'application/json' // Puedes añadir Accept si quieres
        }
    });
    if (!response.ok) {
        // Intenta obtener más info del error si es posible
        let errorMsg = `Failed to fetch offices (${response.status})`;
        try { const errorData = await response.json(); errorMsg = errorData.message || errorMsg; } catch { }
        throw new Error(errorMsg);
    }
    return response.json();
};

export function OfficeSelector() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname(); // Para reconstruir URL

    const currentViewOfficeId = searchParams.get('viewOfficeId');
    const userOffice = session?.user?.officeId; // Asume que se llama officeId en la sesión

    // Clave SWR: Solo fetch si es superadmin y tiene token
    const swrKey = (session?.user?.role === 'superadmin' && session?.accessToken)
        ? [`${process.env.NEXT_PUBLIC_BACKEND_URL}/offices`, session.accessToken]
        : null;

    const { data: offices, error, isLoading } = useSWR<OfficeOption[]>(swrKey, fetcher, { revalidateOnFocus: false });

    // Determina el valor seleccionado actual (puede ser el ID de la oficina del usuario o el del query param)
    const selectedValue = currentViewOfficeId ?? userOffice ?? ''; // Fallback a ''

    const handleOfficeChange = (newOfficeId: string) => {
        const currentParams = new URLSearchParams(Array.from(searchParams.entries()));

        if (newOfficeId && newOfficeId !== userOffice) {
            // Si se selecciona una oficina específica (y no es la propia del superadmin), añade/actualiza el query param
            currentParams.set('viewOfficeId', newOfficeId);
        } else {
            // Si se selecciona "Mi Oficina" o no hay valor, elimina el query param
            currentParams.delete('viewOfficeId');
        }
        const search = currentParams.toString();
        const query = search ? `?${search}` : '';
        // Navega a la misma ruta pero con los query params actualizados
        router.push(`${pathname}${query}`);
    };

    // No renderizar nada si no es superadmin o la sesión está cargando/no autenticada
    if (status !== 'authenticated' || session?.user?.role !== 'superadmin') {
        return null;
    }

    if (isLoading) {
        return <Skeleton className="h-9 w-48 rounded-md" />;
    }
    if (error) {
        return <span className="text-xs text-red-500">Error oficinas</span>;
    }

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Viendo Oficina:</span>
            <Select value={selectedValue} onValueChange={handleOfficeChange}>
                <SelectTrigger className="w-[180px] h-9 text-sm">
                    <SelectValue placeholder="Seleccionar Oficina" />
                </SelectTrigger>
                <SelectContent>
                    {/* Opción para ver la oficina propia del SuperAdmin */}
                    {/* Opción para ver "Todas" - Requeriría lógica backend */}
                    {/* <SelectItem value="all">Todas las Oficinas</SelectItem> */}
                    <hr className="my-1" />
                    {/* Lista de otras oficinas */}
                    {offices?.map((office) => (
                        <SelectItem key={office.id.toString()} value={office.id.toString()}>
                            {office.name} ({office.id})
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}