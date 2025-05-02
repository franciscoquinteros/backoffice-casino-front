"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card } from '../ui/card';
import { useSession } from 'next-auth/react';
import { TicketFilter } from '../hooks/tickets';

interface TicketsFiltersProps {
    onChange: (newFilters: Partial<TicketFilter>) => void;
    onReset: () => void;
}

interface Operator {
    id: string;
    username: string;
    email: string;
    ticketCount: number;
}

export function TicketsFilters({ onChange, onReset }: TicketsFiltersProps) {
    const { data: session } = useSession();
    const [operators, setOperators] = useState<Operator[]>([]);
    const [loading, setLoading] = useState(false);

    // Estados internos para los campos del filtro
    const [status, setStatus] = useState('all');
    const [agentId, setAgentId] = useState('all');
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Cargar operadores de la oficina del usuario
    useEffect(() => {
        if (session?.accessToken) {
            fetchOperators();
        }
    }, [session,]);

    const fetchOperators = async () => {
        try {
            setLoading(true);
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/zendesk/operators-with-ticket-counts`,
                {
                    headers: {
                        'Authorization': `Bearer ${session?.accessToken}`,
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setOperators(data);
            } else {
                console.error('Error al cargar operadores:', await response.text());
            }
        } catch (error) {
            console.error('Error al obtener operadores:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = (value: string) => {
        setStatus(value);
        onChange({ status: value });
    };

    const handleAgentChange = (value: string) => {
        setAgentId(value);
        onChange({ agentId: value });
    };

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(event.target.value);
        onChange({ search: event.target.value });
    };

    const handleDateFromChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setDateFrom(event.target.value);
        onChange({ dateFrom: event.target.value });
    };

    const handleDateToChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setDateTo(event.target.value);
        onChange({ dateTo: event.target.value });
    };

    const handleInternalReset = () => {
        setStatus('all');
        setAgentId('all');
        setSearch('');
        setDateFrom('');
        setDateTo('');
        onReset(); // Llama a la función onReset del padre
    };

    return (
        <Card className="mb-4 p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <h2 className="text-lg font-medium">Filtros</h2>
                <Button variant="outline" onClick={handleInternalReset}>Limpiar Filtros</Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Input de Búsqueda */}
                <div className="space-y-2">
                    <Label htmlFor="search">Buscar</Label>
                    <Input
                        id="search"
                        placeholder="ID, Asunto, Usuario..."
                        value={search}
                        onChange={handleSearchChange}
                    />
                </div>

                {/* Selector de Estado */}
                <div className="space-y-2">
                    <Label htmlFor="status">Estado</Label>
                    <Select value={status} onValueChange={handleStatusChange}>
                        <SelectTrigger id="status">
                            <SelectValue placeholder="Filtrar por estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="new">Nuevo</SelectItem>
                            <SelectItem value="open">Abierto</SelectItem>
                            <SelectItem value="pending">Pendiente</SelectItem>
                            <SelectItem value="hold">En Espera</SelectItem>
                            <SelectItem value="solved">Resuelto</SelectItem>
                            <SelectItem value="closed">Cerrado</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Selector de Operador Asignado */}
                <div className="space-y-2">
                    <Label htmlFor="agent">Operador Asignado</Label>
                    <Select value={agentId} onValueChange={handleAgentChange} disabled={loading || operators.length === 0}>
                        <SelectTrigger id="agent">
                            <SelectValue placeholder={loading ? "Cargando..." : "Filtrar por operador"} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {operators.map(operator => (
                                <SelectItem key={operator.id} value={operator.id.toString()}>
                                    {operator.username} ({operator.ticketCount})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Filtros de Fecha */}
                <div className="space-y-2">
                    <Label htmlFor="dateFrom">Desde</Label>
                    <Input
                        id="dateFrom"
                        type="date"
                        value={dateFrom}
                        onChange={handleDateFromChange}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="dateTo">Hasta</Label>
                    <Input
                        id="dateTo"
                        type="date"
                        value={dateTo}
                        onChange={handleDateToChange}
                    />
                </div>
            </div>
        </Card>
    );
}