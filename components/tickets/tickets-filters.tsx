// Ejemplo dentro de tu componente: components/tickets/tickets-filters.tsx

"use client";

import { useState, useEffect, useCallback } from "react"; // <--- Asegúrate de importar useCallback
import { useSession } from "next-auth/react"; // Para obtener el token
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TicketFilter } from "../hooks/tickets";
import { Label } from "@radix-ui/react-label";

// Define una interfaz para los operadores si no la tienes globalmente
interface OperatorInfo {
    id: number | string;
    username: string;
    email?: string;
    ticketCount: number;
}

interface TicketsFiltersProps {
    onChange: (newFilters: Partial<TicketFilter>) => void;
    onReset: () => void;
    // Podrías pasar los operadores como prop si los cargas en el padre,
    // pero aquí los cargaremos internamente como ejemplo.
}

export function TicketsFilters({ onChange, onReset }: TicketsFiltersProps) {
    const { data: session, status: sessionStatus } = useSession(); // Obtener sesión
    const [operators, setOperators] = useState<OperatorInfo[]>([]); // Estado para operadores
    const [loadingOperators, setLoadingOperators] = useState(false); // Estado de carga específico

    // Estados internos para los filtros (ejemplo)
    const [internalFilters, setInternalFilters] = useState<TicketFilter>({
         status: "all",
         operator: "all", // Usa operator para el ID del operador en el filtro
         search: "",
         dateRange: "all"
    });

    // --- fetchOperators ENVUELTO EN useCallback ---
    const fetchOperators = useCallback(async () => {
        // No ejecutar si no está autenticado o falta el token
        if (sessionStatus !== "authenticated" || !session?.accessToken) {
            console.log("fetchOperators skipped: session not ready or no token.");
            return;
        }
        const accessToken = session.accessToken; // Guarda el token

        try {
            setLoadingOperators(true); // Inicia carga de operadores
            console.log("Fetching operators...");
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/zendesk/operators-with-ticket-counts`, // Endpoint que creaste
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`, // <--- Usa el token de la sesión
                        'Accept': 'application/json',
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                 console.log("Operators data received:", data);
                setOperators(Array.isArray(data) ? data : []); // Establece los operadores
            } else {
                console.error('Error fetching operators:', response.status, await response.text());
                 setOperators([]); // Limpia en caso de error
            }
        } catch (error: unknown) { // Usa unknown
            console.error('Error fetching operators:', error);
            setOperators([]); // Limpia en caso de error
            // Podrías mostrar un toast aquí si lo deseas
            // toast.error(error instanceof Error ? error.message : 'Failed to load operators');
        } finally {
            setLoadingOperators(false); // Termina carga de operadores
        }
    // Depende de 'session' porque lee 'session.accessToken'
    // No necesita depender de setLoadingOperators o setOperators (son estables)
    }, [session, sessionStatus]);
    // --- FIN fetchOperators ---


    // useEffect para llamar a fetchOperators cuando la sesión esté lista
    // Esto resuelve la advertencia exhaustive-deps que tenías
    useEffect(() => {
         if (sessionStatus === "authenticated") {
             console.log("Session ready, fetching operators...");
             fetchOperators();
         }
         // Si no está autenticado, no hace nada (se podría limpiar 'operators' si quieres)
         // else { setOperators([]); }
    }, [sessionStatus, fetchOperators]); // Ahora depende de la función envuelta en useCallback


    // --- Lógica de manejo de cambios de filtros internos y llamada a onChange prop ---
     const handleInternalFilterChange = (field: keyof TicketFilter, value: string) => {
         const newFilters = { ...internalFilters, [field]: value };
         setInternalFilters(newFilters);
         // Llama a la función del padre para actualizar el estado global de filtros
         // Pasa solo el campo que cambió para que el padre haga merge
         onChange({ [field]: value });
     };

      const handleInternalReset = () => {
          const defaultFilters = { status: "all", operator: "all", search: "", dateRange: "all" };
          setInternalFilters(defaultFilters);
          onReset(); // Llama a la función onReset del padre
      };


    // --- JSX del componente de filtros ---
    return (
        <Card className="mb-4">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Filtros</CardTitle>
                    <Button variant="ghost" size="sm" onClick={handleInternalReset} className="h-8 gap-1">
                        <X className="h-4 w-4" /> Limpiar
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end"> {/* Usa items-end para alinear botón */}
                    {/* Búsqueda */}
                    <div className="space-y-1">
                         <Label htmlFor="search-filter">Buscar</Label>
                         <div className="relative">
                             <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                             <Input
                                id="search-filter"
                                placeholder="ID, Asunto, Usuario..."
                                className="pl-8"
                                value={internalFilters.search}
                                onChange={(e) => handleInternalFilterChange("search", e.target.value)}
                             />
                         </div>
                    </div>
                    {/* Estado */}
                    <div className="space-y-1">
                         <Label htmlFor="status-filter">Estado</Label>
                         <Select value={internalFilters.status} onValueChange={(value) => handleInternalFilterChange("status", value)}>
                            <SelectTrigger id="status-filter"><SelectValue placeholder="Estado" /></SelectTrigger>
                            <SelectContent>
                                 <SelectItem value="all">Todos</SelectItem>
                                 <SelectItem value="open">Abierto</SelectItem>
                                 <SelectItem value="pending">Pendiente</SelectItem>
                                 <SelectItem value="solved">Resuelto</SelectItem>
                                 <SelectItem value="closed">Cerrado</SelectItem>
                            </SelectContent>
                         </Select>
                    </div>
                    {/* Fecha */}
                    <div className="space-y-1">
                         <Label htmlFor="date-filter">Fecha Creación</Label>
                         <Select value={internalFilters.dateRange} onValueChange={(value) => handleInternalFilterChange("dateRange", value)}>
                             <SelectTrigger id="date-filter"><SelectValue placeholder="Rango" /></SelectTrigger>
                             <SelectContent>
                                 <SelectItem value="all">Cualquiera</SelectItem>
                                 <SelectItem value="today">Hoy</SelectItem>
                                 <SelectItem value="yesterday">Ayer</SelectItem>
                                 <SelectItem value="thisWeek">Esta Semana</SelectItem>
                                 <SelectItem value="thisMonth">Este Mes</SelectItem>
                             </SelectContent>
                         </Select>
                    </div>
                    {/* Operador */}
                    <div className="space-y-1">
                         <Label htmlFor="operator-filter">Operador</Label>
                         <Select
                            value={internalFilters.operator}
                            onValueChange={(value) => handleInternalFilterChange("operator", value)}
                            disabled={loadingOperators}
                         >
                             <SelectTrigger id="operator-filter"><SelectValue placeholder="Operador" /></SelectTrigger>
                             <SelectContent>
                                 <SelectItem value="all">Todos</SelectItem>
                                 <SelectItem value="unassigned">Sin asignar</SelectItem>
                                 {loadingOperators ? (
                                      <SelectItem value="loading" disabled>Cargando...</SelectItem>
                                 ) : (
                                      operators.map(op => (
                                          <SelectItem key={op.id.toString()} value={op.id.toString()}>
                                              {op.username} ({op.ticketCount})
                                          </SelectItem>
                                      ))
                                 )}
                             </SelectContent>
                         </Select>
                    </div>
                     {/* Placeholder para botón o espacio extra */}
                     {/* <div className="pt-5 self-end">
                         <Button onClick={handleInternalReset} className="w-full">Reset</Button>
                    </div> */}
                </div>
            </CardContent>
        </Card>
    );
}