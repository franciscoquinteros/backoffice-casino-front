"use client";

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { useSession } from 'next-auth/react';
import { Skeleton } from '@/components/ui/skeleton';

interface OfficeOption {
    id: string;
    name: string;
}

interface OfficeFilterProps {
    onChange: (officeId: string | null) => void;
    selectedOffice: string | null;
}

export default function OfficeFilter({ onChange, selectedOffice }: OfficeFilterProps) {
    const { data: session } = useSession();
    const [offices, setOffices] = useState<OfficeOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchOffices = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/offices`, {
                    headers: {
                        'Authorization': `Bearer ${session?.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Error al obtener oficinas');
                }

                const data = await response.json();
                setOffices(data);
            } catch (error) {
                console.error('Error al cargar oficinas:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (session?.accessToken) {
            fetchOffices();
        }
    }, [session?.accessToken]);

    if (isLoading) {
        return <Skeleton className="h-10 w-64" />;
    }

    return (
        <div className="flex items-center gap-3">
            <Label htmlFor="office-filter">Filtrar por Oficina:</Label>
            <Select
                value={selectedOffice || ''}
                onValueChange={(value) => onChange(value === 'all' ? null : value)}
            >
                <SelectTrigger id="office-filter" className="w-[220px]">
                    <SelectValue placeholder="Todas las Oficinas" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todas las Oficinas</SelectItem>
                    {offices.map((office) => (
                        <SelectItem key={office.id} value={office.id}>
                            {office.name} ({office.id})
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
} 