"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

// Interfaz para filtros de fecha
export interface DateFilter {
    from?: string | null;
    to?: string | null;
    period?: 'day' | 'week' | 'month' | 'custom' | null;
}

// Interfaz para las estadísticas
export interface DashboardStats {
    totalTransactions: number;
    totalAmount: number;
    deposits: {
        total: number;
        amount: number;
        pending: number;
        accepted: number;
        rejected: number;
    };
    withdrawals: {
        total: number;
        amount: number;
        pending: number;
        accepted: number;
        rejected: number;
    };
    // Nuevo campo para el total neto (depósitos - retiros)
    netTotal: number;
    byOffice: Record<string, {
        total: number;
        totalAmount: number;
        deposits: number;
        withdrawals: number;
        depositsAmount: number;
        withdrawalsAmount: number;
    }>;
    monthlyTrend: {
        currentMonth: {
            count: number;
            amount: number;
        };
        previousMonth?: {
            count: number;
            amount: number;
        };
        countChange?: number;
        amountChange?: number;
    };
}

export function useDashboardStats(officeId?: string | null, dateFilter?: DateFilter) {
    const { data: session } = useSession();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Función para obtener estadísticas globales o por oficina
    const fetchStats = useCallback(async () => {
        if (!session?.accessToken) {
            setError('No hay sesión activa');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            console.log('Fetching dashboard stats with token:', session.accessToken);

            // Construir la URL según si hay un officeId o no
            let url = officeId
                ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/transactions/stats/by-office/${officeId}`
                : `${process.env.NEXT_PUBLIC_BACKEND_URL}/transactions/stats/summary`;

            // Agregar parámetros de fecha si existen
            const params = new URLSearchParams();
            if (dateFilter?.from) params.append('from', dateFilter.from);
            if (dateFilter?.to) params.append('to', dateFilter.to);
            if (dateFilter?.period) params.append('period', dateFilter.period);

            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            // Hacer la petición al endpoint
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Calcular el total neto (depósitos - retiros)
            const netTotal = (data.deposits?.amount || 0) - (data.withdrawals?.amount || 0);
            const statsWithNetTotal = {
                ...data,
                netTotal
            };

            setStats(statsWithNetTotal);
            setError(null);
        } catch (err) {
            console.error('Error al obtener estadísticas:', err);
            setError(err instanceof Error ? err.message : 'Error al cargar estadísticas');
            setStats(null);
        } finally {
            setIsLoading(false);
        }
    }, [session?.accessToken, officeId, dateFilter]);

    // Efecto para cargar estadísticas al inicio o cuando cambia la oficina seleccionada o los filtros
    useEffect(() => {
        if (session?.accessToken) {
            fetchStats();
        }
    }, [session?.accessToken, officeId, dateFilter, fetchStats]);

    return {
        stats,
        isLoading,
        error,
        refetch: fetchStats
    };
} 