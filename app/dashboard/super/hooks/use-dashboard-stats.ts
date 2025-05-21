"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

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
    byOffice: Record<string, {
        total: number;
        totalAmount: number;
        deposits: number;
        withdrawals: number;
        depositsAmount: number;
        withdrawalsAmount: number;
    }>;
    recentActivity: Array<{
        id: string;
        type: string;
        amount: number;
        status: string;
        date_created?: string | Date;
        office?: string;
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

export function useDashboardStats(officeId?: string | null) {
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
            const url = officeId
                ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/transactions/stats/by-office/${officeId}`
                : `${process.env.NEXT_PUBLIC_BACKEND_URL}/transactions/stats/summary`;

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
            setStats(data);
            setError(null);
        } catch (err) {
            console.error('Error al obtener estadísticas:', err);
            setError(err instanceof Error ? err.message : 'Error al cargar estadísticas');
            setStats(null);
        } finally {
            setIsLoading(false);
        }
    }, [session?.accessToken, officeId]);

    // Efecto para cargar estadísticas al inicio o cuando cambia la oficina seleccionada
    useEffect(() => {
        if (session?.accessToken) {
            fetchStats();
        }
    }, [session?.accessToken, officeId, fetchStats]);

    return {
        stats,
        isLoading,
        error,
        refetch: fetchStats
    };
} 