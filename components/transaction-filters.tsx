// app/dashboard/transactions/components/transaction-filters.tsx
"use client";

import { useState } from 'react';
import {
    Card,
    CardContent
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Filter,
    RefreshCw,
    Search
} from "lucide-react";
import { TransactionFilter } from '@/components/transaction-service';

interface TransactionFiltersProps {
    onChange: (filters: TransactionFilter) => void;
    onReset: () => void;
}

export function TransactionFilters({ onChange, onReset }: TransactionFiltersProps) {
    const [filters, setFilters] = useState<TransactionFilter>({
        minAmount: undefined,
        maxAmount: undefined,
        search: '',
        dateFrom: '',
        dateTo: ''
    });
    const [isExpanded, setIsExpanded] = useState(false);

    // Actualiza los filtros y notifica al componente padre
    const handleFilterChange = (key: keyof TransactionFilter, value: string | number | undefined) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        onChange(newFilters);
    };

    // Resetea los filtros y notifica al componente padre
    const handleReset = () => {
        const emptyFilters = {
            minAmount: undefined,
            maxAmount: undefined,
            search: '',
            dateFrom: '',
            dateTo: ''
        };
        setFilters(emptyFilters);
        onReset();
    };

    return (
        <Card className="mb-6">
            <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-2">
                        <Filter className="h-4 w-4 text-gray-500" />
                        <h3 className="text-sm font-medium">Filtros</h3>
                    </div>
                    <div className="flex space-x-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            {isExpanded ? 'Ocultar filtros' : 'Mostrar más'}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-xs flex items-center"
                            onClick={handleReset}
                        >
                            <RefreshCw className="mr-1 h-3 w-3" />
                            Limpiar
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col space-y-4">
                    {/* Fila principal de filtros siempre visible */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Buscar</label>
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="ID, email o cliente..."
                                    className="pl-8"
                                    value={filters.search || ''}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex space-x-2">
                            <div className="w-1/2">
                                <label className="text-xs text-gray-500 mb-1 block">Monto mínimo</label>
                                <Input
                                    type="number"
                                    placeholder="Mín $"
                                    value={filters.minAmount ?? ''}
                                    onChange={(e) => handleFilterChange(
                                        'minAmount',
                                        e.target.value ? parseFloat(e.target.value) : undefined
                                    )}
                                />
                            </div>
                            <div className="w-1/2">
                                <label className="text-xs text-gray-500 mb-1 block">Monto máximo</label>
                                <Input
                                    type="number"
                                    placeholder="Máx $"
                                    value={filters.maxAmount ?? ''}
                                    onChange={(e) => handleFilterChange(
                                        'maxAmount',
                                        e.target.value ? parseFloat(e.target.value) : undefined
                                    )}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Filtros adicionales que se pueden expandir/contraer */}
                    {isExpanded && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Desde</label>
                                <Input
                                    type="date"
                                    value={filters.dateFrom || ''}
                                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Hasta</label>
                                <Input
                                    type="date"
                                    value={filters.dateTo || ''}
                                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}