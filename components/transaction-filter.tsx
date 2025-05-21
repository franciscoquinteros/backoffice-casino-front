"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { CalendarIcon, Search, X } from "lucide-react";
import { TransactionFilter as FilterType } from "@/components/transaction-service";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface TransactionFilterProps {
    onFilterChange: (filters: FilterType) => void;
    onResetFilters: () => void;
    filter: FilterType;
}

export function TransactionFilter({
    onFilterChange,
    onResetFilters,
    filter
}: TransactionFilterProps) {
    const [search, setSearch] = useState(filter.search || "");
    const [minAmount, setMinAmount] = useState(filter.minAmount?.toString() || "");
    const [maxAmount, setMaxAmount] = useState(filter.maxAmount?.toString() || "");
    const [dateFrom, setDateFrom] = useState<Date | undefined>(
        filter.dateFrom ? new Date(filter.dateFrom) : undefined
    );
    const [dateTo, setDateTo] = useState<Date | undefined>(
        filter.dateTo ? new Date(filter.dateTo) : undefined
    );

    // Actualizar filtros cuando cambian los inputs
    useEffect(() => {
        const newFilters: FilterType = {};

        if (search) newFilters.search = search;
        if (minAmount) newFilters.minAmount = parseFloat(minAmount);
        if (maxAmount) newFilters.maxAmount = parseFloat(maxAmount);
        if (dateFrom) newFilters.dateFrom = dateFrom.toISOString();
        if (dateTo) newFilters.dateTo = dateTo.toISOString();

        onFilterChange(newFilters);
    }, [search, minAmount, maxAmount, dateFrom, dateTo, onFilterChange]);

    // Restablecer todos los filtros
    const handleReset = () => {
        setSearch("");
        setMinAmount("");
        setMaxAmount("");
        setDateFrom(undefined);
        setDateTo(undefined);
        onResetFilters();
    };

    return (
        <Card className="p-4 mb-4">
            <div className="grid gap-4 md:grid-cols-5">
                <div>
                    <Label htmlFor="search">Buscar</Label>
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="search"
                            placeholder="ID, Email, CBU..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div>
                    <Label htmlFor="min-amount">Monto Mínimo</Label>
                    <Input
                        id="min-amount"
                        type="number"
                        placeholder="Min $"
                        value={minAmount}
                        onChange={(e) => setMinAmount(e.target.value)}
                    />
                </div>
                <div>
                    <Label htmlFor="max-amount">Monto Máximo</Label>
                    <Input
                        id="max-amount"
                        type="number"
                        placeholder="Max $"
                        value={maxAmount}
                        onChange={(e) => setMaxAmount(e.target.value)}
                    />
                </div>
                <div>
                    <Label>Fecha Desde</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !dateFrom && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateFrom ? format(dateFrom, "PPP", { locale: es }) : "Seleccionar fecha"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={dateFrom}
                                onSelect={setDateFrom}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                <div>
                    <Label>Fecha Hasta</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !dateTo && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateTo ? format(dateTo, "PPP", { locale: es }) : "Seleccionar fecha"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={dateTo}
                                onSelect={setDateTo}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
            <div className="flex justify-end mt-4">
                <Button variant="outline" size="sm" onClick={handleReset}>
                    <X className="mr-2 h-4 w-4" />
                    Limpiar filtros
                </Button>
            </div>
        </Card>
    );
} 