// Ruta Ejemplo: app/dashboard/reports/page.tsx (o donde esté tu componente)
'use client'

import React, { useState } from 'react';
import { useSession } from 'next-auth/react'; // Para autenticación
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, TooltipProps } from 'recharts';
import { Clock, Users, MessageSquare, Ticket, AlertCircle } from 'lucide-react';
// Asegúrate que la ruta a este archivo sea correcta
import { StatusDistribution, TicketsByAgent, TicketsTrend, MessageVolume, /* MessageDistribution, */ ResponseTimeByAgent, LoginActivity, UserRole, NewUsersByMonth, DashboardSummary, ConversationStatusDistribution, TransactionByStatus, TransactionTrend, TransactionByAgent } from './services/report.api';
import { useTheme } from 'next-themes';
import useSWR from 'swr'; // Para data fetching
import { Skeleton } from "@/components/ui/skeleton"; // Ajusta ruta
import { Badge } from "@/components/ui/badge"; // Para etiqueta de oficina
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { subDays, subWeeks, subMonths, format as formatDate, startOfWeek, startOfMonth } from 'date-fns';

// --- Interfaces para Props de Componentes Auxiliares ---
interface SummaryCardProps {
    title: string;
    value: string | number;
    trend: string;
    trendPositive?: boolean;
    icon: React.ReactNode;
}

interface TabProps {
    children: React.ReactNode;
    active: boolean;
    onClick: () => void;
}

interface ChartCardProps {
    title: string;
    children: React.ReactNode;
    fullWidth?: boolean;
}

// Tipo genérico para datos de gráficos
type ChartData = StatusDistribution[] | TicketsByAgent[] | TicketsTrend[] |
    MessageVolume[] | /*MessageDistribution[] |*/ ResponseTimeByAgent[] |
    LoginActivity[] | UserRole[] | NewUsersByMonth[] | ConversationStatusDistribution[] |
    TransactionTrend | TransactionByAgent[] | TransactionByStatus[];

// --- Componente Principal ---
const ReportsDashboard = () => {
    const { data: session, status: sessionStatus } = useSession();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Colores para gráficos
    const LIGHT_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#8dd1e1'];
    const DARK_COLORS = ['#4dabf5', '#34d399', '#fbbf24', '#fb923c', '#a78bfa', '#a7d8de'];
    const COLORS = isDark ? DARK_COLORS : LIGHT_COLORS;

    const [activeTab, setActiveTab] = useState('tickets');
    // Estado para el filtro de período
    const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'custom'>('month');
    const [customFromDate, setCustomFromDate] = useState('');
    const [customToDate, setCustomToDate] = useState('');

    // --- Fetcher para SWR (con Autenticación) ---
    const fetcher = async ([url, token]: [string, string | undefined]) => {
        if (!token) throw new Error('Authentication token not available');
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
        if (!baseUrl) throw new Error('API URL is not configured.');

        const response = await fetch(`${baseUrl}${url}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        });
        if (!response.ok) {
            let errorMsg = `Error fetching report data (${response.status})`;
            try { const errorData = await response.json(); errorMsg = errorData.message || errorMsg; } catch { } { }
            throw new Error(errorMsg);
        }
        const data = await response.json();
        // Si la respuesta tiene una propiedad data, devolver esa propiedad
        // Esto hace que el fetcher sea compatible con ambas estructuras de respuesta
        return data.data || data;
    };

    // --- Hooks SWR (dependen del token) ---
    const accessToken = session?.accessToken;

    // Definimos las claves SWR condicionalmente
    const summaryKey = accessToken ? ['/reports/dashboard-summary', accessToken] : null;
    const ticketStatusKey = accessToken ? ['/reports/tickets-by-status', accessToken] : null;
    const ticketAgentKey = accessToken ? ['/reports/tickets-by-agent', accessToken] : null;
    const ticketTrendKey = accessToken ? ['/reports/tickets-trend', accessToken] : null;

    const shouldFetchChatData = activeTab === 'chats' && accessToken;
    const messageVolumeKey = shouldFetchChatData ? ['/reports/messages-volume', accessToken] : null;
    const conversationStatusKey = shouldFetchChatData ? ['/reports/conversation-status-distribution', accessToken] : null;
    const responseTimeKey = shouldFetchChatData ? ['/reports/response-time-by-agent', accessToken] : null;

    const shouldFetchUserData = activeTab === 'users' && accessToken;
    const loginActivityKey = shouldFetchUserData ? ['/reports/login-activity', accessToken] : null;
    const userRolesKey = shouldFetchUserData ? ['/reports/user-roles', accessToken] : null;
    const newUsersKey = shouldFetchUserData ? ['/reports/new-users-by-month', accessToken] : null;

    // Construir key SWR para transacciones según período
    const periodParams = () => {
        if (period === 'custom') {
            return `?period=custom&from=${customFromDate || ''}&to=${customToDate || ''}`;
        } else if (period === 'day') {
            const today = formatDate(new Date(), 'yyyy-MM-dd');
            return `?period=custom&from=${today}&to=${today}`;
        } else if (period === 'week') {
            const now = new Date();
            const start = startOfWeek(now, { weekStartsOn: 1 });
            const end = new Date();
            return `?period=custom&from=${formatDate(start, 'yyyy-MM-dd')}&to=${formatDate(end, 'yyyy-MM-dd')}`;
        } else if (period === 'month') {
            const now = new Date();
            const start = startOfMonth(now);
            const end = new Date();
            return `?period=custom&from=${formatDate(start, 'yyyy-MM-dd')}&to=${formatDate(end, 'yyyy-MM-dd')}`;
        }
        return `?period=${period}`;
    };
    // Nuevos hooks SWR para transacciones
    const shouldFetchTransactionData = activeTab === 'transactions' && accessToken;
    const transactionStatusKey = shouldFetchTransactionData ? [`/reports/transactions-by-status${periodParams()}`, accessToken] : null;

    // SWR Hooks usando las claves condicionales
    const { data: summaryData, error: summaryError, isLoading: isLoadingSummary } = useSWR<DashboardSummary>(summaryKey, fetcher, { revalidateOnFocus: false, revalidateIfStale: false });
    const { data: ticketStatusData, error: ticketStatusError, isLoading: isLoadingTicketStatus } = useSWR<StatusDistribution[]>(ticketStatusKey, fetcher, { revalidateOnFocus: false });
    const { data: ticketAgentData, error: ticketAgentError, isLoading: isLoadingTicketAgent } = useSWR<TicketsByAgent[]>(ticketAgentKey, fetcher, { revalidateOnFocus: false });
    const { data: ticketTrendData, error: ticketTrendError, isLoading: isLoadingTicketTrend } = useSWR<TicketsTrend[]>(ticketTrendKey, fetcher, { revalidateOnFocus: false });
    const { data: messageVolumeData, error: messageVolumeError, isLoading: isLoadingMessageVolume } = useSWR<MessageVolume[]>(messageVolumeKey, fetcher, { revalidateOnFocus: false });
    const { data: conversationStatusData, error: conversationStatusError, isLoading: isLoadingConversationStatus } = useSWR<ConversationStatusDistribution[]>(conversationStatusKey, fetcher, { revalidateOnFocus: false });
    const { data: responseTimeData, error: responseTimeError, isLoading: isLoadingResponseTime } = useSWR<ResponseTimeByAgent[]>(responseTimeKey, fetcher, { revalidateOnFocus: false });
    const { data: loginActivityData, error: loginActivityError, isLoading: isLoadingLoginActivity } = useSWR<LoginActivity[]>(loginActivityKey, fetcher, { revalidateOnFocus: false });
    const { data: userRolesData, error: userRolesError, isLoading: isLoadingUserRoles } = useSWR<UserRole[]>(userRolesKey, fetcher, { revalidateOnFocus: false });
    const { data: newUsersData, error: newUsersError, isLoading: isLoadingNewUsers } = useSWR<NewUsersByMonth[]>(newUsersKey, fetcher, { revalidateOnFocus: false });

    // Nuevos SWR hooks para transacciones
    const { data: transactionStatusData } = useSWR<TransactionByStatus[]>(transactionStatusKey, fetcher, { revalidateOnFocus: false });

    // --- Tooltip Personalizado ---
    const customTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
        if (active && payload && payload.length) {
            return (
                <div className={`bg-background/90 dark:bg-popover/90 backdrop-blur-sm p-2 border border-border rounded shadow-lg text-sm`}>
                    {label && <p className="label mb-1 font-semibold">{`${label}`}</p>}
                    {payload.map((entry, index) => (
                        <div key={`item-${index}`} className="flex items-center">
                            <div className="w-2 h-2 mr-2 rounded-full" style={{ backgroundColor: entry.color || entry.payload?.fill || COLORS[index % COLORS.length] }} />
                            <p className="text-popover-foreground">{`${entry.name}: ${entry.value}`}</p>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    // --- Función para Renderizar Gráficos (con Error y Empty UI) ---
    const renderSafeChart = <T extends ChartData>(
        data: T | null | undefined,
        error: Error | null | undefined,
        isLoading: boolean,
        renderFunction: (validData: T) => React.ReactNode,
        emptyMessage: string = "No hay datos disponibles"
    ): React.ReactNode => {
        if (isLoading) {
            return <ChartSkeleton />; // Muestra skeleton mientras carga
        }
        if (error) { // Muestra error
            return (
                <div className="flex flex-col items-center justify-center h-full text-destructive text-center px-2">
                    <AlertCircle className="h-8 w-8 mb-2 text-red-500" />
                    <p className="text-sm font-medium">Error al cargar datos</p>
                    <p className="text-xs mt-1">{error.message}</p>
                </div>
            );
        }
        if (!data) { // Muestra mensaje vacío si no hay datos
            return (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    {emptyMessage}
                </div>
            );
        }
        // Verifica si es un array y está vacío
        if (Array.isArray(data) && data.length === 0) {
            return (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    {emptyMessage}
                </div>
            );
        }
        try { // Renderiza el gráfico
            return renderFunction(data as T);
        } catch (renderError: unknown) { // Captura errores de renderizado del gráfico
            console.error("Error rendering chart:", renderError);
            const errorMessage = renderError instanceof Error ? renderError.message : "Error desconocido";
            return (
                <div className="flex flex-col items-center justify-center h-full text-destructive text-center px-2">
                    <AlertCircle className="h-8 w-8 mb-2 text-red-500" />
                    <p className="text-sm font-medium">Error al mostrar gráfico</p>
                    <p className="text-xs mt-1">{errorMessage}</p>
                </div>
            );
        }
    };

    // --- Helpers para breakdown de transacciones ---
    function formatAmount(amount: number) {
        return amount.toLocaleString('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function getTransactionCount(type: 'deposit' | 'withdraw', status: string) {
        if (!transactionStatusData) return 0;
        const item = transactionStatusData.find(
            (t) => t.type === type && t.name === status
        );
        return item?.count ?? 0;
    }

    function getTransactionAmount(type: 'deposit' | 'withdraw', status: string) {
        if (!transactionStatusData) return 0;
        const item = transactionStatusData.find(
            (t) => t.type === type && t.name === status
        );
        return item?.value ?? 0;
    }

    function getDepositsTotal() {
        if (!transactionStatusData) return 0;
        return getTransactionAmount('deposit', 'Aceptado') + getTransactionAmount('deposit', 'Match MP');
    }

    function getWithdrawalsTotal() {
        if (!transactionStatusData) return 0;
        // Para retiros solo sumamos 'Aceptado' según las reglas del usuario
        return getTransactionAmount('withdraw', 'Aceptado');
    }

    function getDepositsAcceptedAndMatch() {
        if (!transactionStatusData) return 0;
        return getTransactionAmount('deposit', 'Aceptado') + getTransactionAmount('deposit', 'Match MP');
    }

    function getWithdrawalsAcceptedAndMatch() {
        if (!transactionStatusData) return 0;
        // Para retiros solo retornamos 'Aceptado' según las reglas del usuario
        return getTransactionAmount('withdraw', 'Aceptado');
    }

    // --- Helpers para obtener el período anterior ---
    function getPreviousPeriod() {
        if (period === 'day') {
            const prev = subDays(new Date(), 1);
            return { period: 'custom', from: formatDate(prev, 'yyyy-MM-dd'), to: formatDate(prev, 'yyyy-MM-dd') };
        } else if (period === 'week') {
            const now = new Date();
            const start = startOfWeek(now, { weekStartsOn: 1 });
            const prevStart = subWeeks(start, 1);
            const prevEnd = subDays(start, 1);
            return { period: 'custom', from: formatDate(prevStart, 'yyyy-MM-dd'), to: formatDate(prevEnd, 'yyyy-MM-dd') };
        } else if (period === 'month') {
            const now = new Date();
            const start = startOfMonth(now);
            const prevStart = subMonths(start, 1);
            const prevEnd = subDays(start, 1);
            return { period: 'custom', from: formatDate(prevStart, 'yyyy-MM-dd'), to: formatDate(prevEnd, 'yyyy-MM-dd') };
        } else if (period === 'custom' && customFromDate && customToDate) {
            const fromDateObj = new Date(customFromDate);
            const toDateObj = new Date(customToDate);
            const diff = (toDateObj.getTime() - fromDateObj.getTime()) / (1000 * 60 * 60 * 24) + 1;
            const prevTo = subDays(new Date(customFromDate), 1);
            const prevFrom = subDays(prevTo, diff - 1);
            return { period: 'custom', from: formatDate(prevFrom, 'yyyy-MM-dd'), to: formatDate(prevTo, 'yyyy-MM-dd') };
        }
        return null;
    }

    // --- SWR para el período anterior ---
    const prevPeriod = getPreviousPeriod();
    const prevTransactionStatusKey = shouldFetchTransactionData && prevPeriod ? [`/reports/transactions-by-status?period=custom&from=${prevPeriod.from}&to=${prevPeriod.to}`, accessToken] : null;
    const { data: prevTransactionStatusData } = useSWR<TransactionByStatus[]>(prevTransactionStatusKey, fetcher, { revalidateOnFocus: false });

    // --- Helpers para el período anterior ---
    function getPrevDepositsTotal() {
        if (!prevTransactionStatusData) return 0;
        const aceptado = prevTransactionStatusData.find(t => t.type === 'deposit' && t.name === 'Aceptado')?.value || 0;
        const match = prevTransactionStatusData.find(t => t.type === 'deposit' && t.name === 'Match MP')?.value || 0;
        return aceptado + match;
    }
    function getPrevDepositsCount() {
        if (!prevTransactionStatusData) return 0;
        const aceptado = prevTransactionStatusData.find(t => t.type === 'deposit' && t.name === 'Aceptado')?.count || 0;
        const match = prevTransactionStatusData.find(t => t.type === 'deposit' && t.name === 'Match MP')?.count || 0;
        return aceptado + match;
    }
    function getVariation() {
        const prev = getPrevDepositsTotal();
        const curr = getDepositsTotal();
        if (prev === 0 && curr === 0) return 0;
        if (prev === 0) return 100;
        return ((curr - prev) / prev) * 100;
    }

    // --- Renderizado Condicional por Sesión ---
    if (sessionStatus === "loading") {
        // Skeleton completo de la página
        return (
            <div className="container mx-auto p-4 animate-pulse">
                {/* Skeleton Título y Badge */}
                <div className="flex items-center gap-x-2 mb-4">
                    <Skeleton className="h-8 w-60" />
                    <Skeleton className="h-6 w-24" />
                </div>
                {/* Skeleton Tarjetas Resumen */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    <SummaryCardSkeleton /> <SummaryCardSkeleton />
                    <SummaryCardSkeleton /> <SummaryCardSkeleton />
                </div>
                {/* Skeleton Tabs */}
                <Skeleton className="h-11 w-full mb-4 border-b border-border" />
                {/* Skeleton Gráficos (ejemplo para layout 2x2 o 2x1+1) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ChartSkeleton /> <ChartSkeleton />
                    <div className="md:col-span-2"><ChartSkeleton /></div> {/* Ejemplo full width */}
                </div>
            </div>
        );
    }
    if (sessionStatus === "unauthenticated") {
        return <div className="container mx-auto p-4">Necesitas iniciar sesión para ver los reportes.</div>;
    }
    if (!accessToken) {
        return <div className="container mx-auto p-4">Error: Token de autenticación no disponible.</div>;
    }
    // --- Fin Renderizado Condicional por Sesión ---


    // --- Renderizado Principal ---
    return (
        <div className="container mx-auto p-4">
            {/* Título y Oficina */}
            <div className="flex items-center gap-x-2 mb-4">
                <h1 className="text-2xl font-bold dark:text-white">Dashboard de Reportes</h1>
                {session?.user?.officeId && (
                    <Badge variant="outline">Oficina: {session.user.officeId}</Badge>
                )}
            </div>

            {/* Tarjetas de Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                {isLoadingSummary ? (
                    <><SummaryCardSkeleton /><SummaryCardSkeleton /><SummaryCardSkeleton /><SummaryCardSkeleton /></>
                ) : summaryError ? (
                    <div className="col-span-full bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded relative" role="alert">
                        <strong className="font-bold">Error al cargar resumen:</strong>
                        <span className="block sm:inline ml-2">{summaryError.message}</span>
                    </div>
                ) : (
                    <>
                        <SummaryCard title="Total de Tickets" value={summaryData?.totalTickets?.value ?? 0} trend={summaryData?.totalTickets?.trend ?? "0%"} icon={<Ticket className="h-8 w-8 text-blue-500" />} />
                        <SummaryCard title="Chats Activos" value={summaryData?.activeChats?.value ?? 0} trend={summaryData?.activeChats?.trend ?? "0%"} icon={<MessageSquare className="h-8 w-8 text-green-500" />} />
                        <SummaryCard title="Total de Usuarios" value={summaryData?.totalUsers?.value ?? 0} trend={summaryData?.totalUsers?.trend ?? "0%"} icon={<Users className="h-8 w-8 text-yellow-500" />} />
                        <SummaryCard title="Tiempo de Respuesta" value={summaryData?.avgResponseTime?.value ?? "0m"} trend={summaryData?.avgResponseTime?.trend ?? "0%"} trendPositive={summaryData?.avgResponseTime?.trendPositive ?? false} icon={<Clock className="h-8 w-8 text-purple-500" />} />
                    </>
                )}
            </div>

            {/* Tabs */}
            <div className="flex mb-4 border-b border-border">
                <Tab active={activeTab === 'tickets'} onClick={() => setActiveTab('tickets')}>Tickets</Tab>
                <Tab active={activeTab === 'chats'} onClick={() => setActiveTab('chats')}>Chats</Tab>
                <Tab active={activeTab === 'users'} onClick={() => setActiveTab('users')}>Usuarios</Tab>
                <Tab active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')}>Depósitos y Retiros</Tab>
            </div>

            {/* Contenido de Tabs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* --- Tab Tickets --- */}
                {activeTab === 'tickets' && (
                    <>
                        <ChartCard title="Estado de Tickets">
                            {renderSafeChart(ticketStatusData, ticketStatusError, isLoadingTicketStatus, (data) => (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={data} cx="50%" cy="50%" labelLine={false}
                                            label={({ name, percent }) => `${name.length > 10 ? name.substring(0, 8) + '..' : name}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius="80%" fill="#8884d8" dataKey="value" nameKey="name">
                                            {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip content={customTooltip} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ))}
                        </ChartCard>
                        <ChartCard title="Tickets por Operador">
                            {renderSafeChart(ticketAgentData, ticketAgentError, isLoadingTicketAgent, (data) => (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart layout="vertical" data={data} margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 10 }} />
                                        <Tooltip content={customTooltip} cursor={{ fill: 'hsl(var(--muted))' }} />
                                        <Bar dataKey="tickets" name="Tickets" barSize={20}>
                                            {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ))}
                        </ChartCard>
                        <ChartCard title="Tendencia de Tickets" fullWidth>
                            {renderSafeChart(ticketTrendData, ticketTrendError, isLoadingTicketTrend, (data) => (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="mes" />
                                        <YAxis />
                                        <Tooltip content={customTooltip} />
                                        <Legend />
                                        <Line type="monotone" dataKey="cantidad" name="Tickets" stroke={COLORS[0]} strokeWidth={2} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ))}
                        </ChartCard>
                    </>
                )}

                {/* --- Tab Chats (COMPLETADO) --- */}
                {activeTab === 'chats' && (
                    <>
                        <ChartCard title="Distribución de Conversaciones">
                            {renderSafeChart(conversationStatusData, conversationStatusError, isLoadingConversationStatus, (data) => (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                                        <Pie data={data} cx="50%" cy="50%" labelLine={false}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius="80%" fill="#82ca9d" dataKey="value" nameKey="name">
                                            {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip content={customTooltip} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ))}
                        </ChartCard>
                        <ChartCard title="Volumen de Mensajes (Hoy)">
                            {renderSafeChart(messageVolumeData, messageVolumeError, isLoadingMessageVolume, (data) => (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="hora" />
                                        <YAxis />
                                        <Tooltip content={customTooltip} />
                                        <Legend />
                                        <Line type="monotone" dataKey="mensajes" name="Mensajes" stroke={COLORS[1]} strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ))}
                        </ChartCard>
                        <ChartCard title="Tiempo de Respuesta por Operador" fullWidth>
                            {renderSafeChart(responseTimeData, responseTimeError, isLoadingResponseTime, (data) => (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart layout="vertical" data={data} margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 10 }} />
                                        <Tooltip content={customTooltip} cursor={{ fill: 'hsl(var(--muted))' }} />
                                        <Bar dataKey="tiempo" name="Tiempo (min)" barSize={20}>
                                            {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ))}
                        </ChartCard>
                    </>
                )}

                {/* --- Tab Users (COMPLETADO) --- */}
                {activeTab === 'users' && (
                    <>
                        <ChartCard title="Actividad de Login (Semana actual)">
                            {renderSafeChart(loginActivityData, loginActivityError, isLoadingLoginActivity, (data) => (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="dia" />
                                        <YAxis />
                                        <Tooltip content={customTooltip} />
                                        <Legend />
                                        <Bar dataKey="logins" name="Logins" fill={COLORS[3]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ))}
                        </ChartCard>
                        <ChartCard title="Roles de Usuario">
                            {renderSafeChart(userRolesData, userRolesError, isLoadingUserRoles, (data) => (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                                        <Pie data={data} cx="50%" cy="50%" labelLine={false}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius="80%" fill="#ffc658" dataKey="value" nameKey="name">
                                            {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip content={customTooltip} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ))}
                        </ChartCard>
                        <ChartCard title="Nuevos Usuarios por Mes" fullWidth>
                            {renderSafeChart(newUsersData, newUsersError, isLoadingNewUsers, (data) => (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="mes" />
                                        <YAxis />
                                        <Tooltip content={customTooltip} />
                                        <Legend />
                                        <Line type="monotone" dataKey="cantidad" name="Nuevos Usuarios" stroke={COLORS[4]} strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ))}
                        </ChartCard>
                    </>
                )}

                {/* --- Tab Depósitos y Retiros --- */}
                {activeTab === 'transactions' && (
                    <>
                        {/* Filtro de período */}
                        <div className="md:col-span-2 mb-4 flex items-center gap-2">
                            <label className="text-sm font-medium">Período:</label>
                            <Select
                                value={period}
                                onValueChange={v => setPeriod(v as 'day' | 'week' | 'month' | 'custom')}
                            >
                                <SelectTrigger className="w-[130px]">
                                    <SelectValue placeholder="Período" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="day">Hoy</SelectItem>
                                    <SelectItem value="week">Esta semana</SelectItem>
                                    <SelectItem value="month">Este mes</SelectItem>
                                    <SelectItem value="custom">Personalizado</SelectItem>
                                </SelectContent>
                            </Select>
                            {period === 'custom' && (
                                <>
                                    <Input
                                        type="date"
                                        value={customFromDate}
                                        onChange={e => setCustomFromDate(e.target.value)}
                                        className="w-[150px]"
                                        placeholder="Desde"
                                    />
                                    <span className="text-sm text-muted-foreground">hasta</span>
                                    <Input
                                        type="date"
                                        value={customToDate}
                                        onChange={e => setCustomToDate(e.target.value)}
                                        className="w-[150px]"
                                        placeholder="Hasta"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPeriod('custom')}
                                    >
                                        Aplicar
                                    </Button>
                                </>
                            )}
                        </div>

                        {/* Tarjetas de Depósitos, Retiros y Total Neto */}
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Depósitos */}
                            <div className="bg-card border rounded-lg p-6 flex flex-col justify-between min-h-[170px]">
                                <div>
                                    <h3 className="text-muted-foreground text-sm font-medium mb-2">Depósitos</h3>
                                    <div className="text-3xl font-bold text-green-600 mb-1">
                                        {formatAmount(getDepositsTotal())}
                                    </div>
                                </div>
                                <div className="text-xs flex flex-wrap gap-2 mt-2">
                                    <span className="text-green-600">{getTransactionCount('deposit', 'Aceptado')} aceptados</span>
                                    <span className="text-yellow-600">{getTransactionCount('deposit', 'Pendiente')} pendientes</span>
                                    <span className="text-red-600">{getTransactionCount('deposit', 'Rechazado')} rechazados</span>
                                    <span className="text-blue-600">{getTransactionCount('deposit', 'Match MP')} match MP</span>
                                </div>
                            </div>

                            {/* Retiros */}
                            <div className="bg-card border rounded-lg p-6 flex flex-col justify-between min-h-[170px]">
                                <div>
                                    <h3 className="text-muted-foreground text-sm font-medium mb-2">Retiros</h3>
                                    <div className="text-3xl font-bold text-red-600 mb-1">
                                        {formatAmount(getWithdrawalsTotal())}
                                    </div>
                                </div>
                                <div className="text-xs flex flex-wrap gap-2 mt-2">
                                    <span className="text-green-600">{getTransactionCount('withdraw', 'Aceptado')} aceptados</span>
                                    <span className="text-yellow-600">{getTransactionCount('withdraw', 'Pendiente')} pendientes</span>
                                    <span className="text-red-600">{getTransactionCount('withdraw', 'Rechazado')} rechazados</span>
                                    <span className="text-blue-600">{getTransactionCount('withdraw', 'Match MP')} match MP</span>
                                </div>
                            </div>

                            {/* Total Neto */}
                            <div className="bg-card border rounded-lg p-6 flex flex-col justify-between min-h-[170px]">
                                <div>
                                    <h3 className="text-muted-foreground text-sm font-medium mb-2">Total Neto</h3>
                                    <div className={`text-3xl font-bold mb-1 ${(getDepositsAcceptedAndMatch() - getWithdrawalsAcceptedAndMatch() >= 0) ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatAmount(getDepositsAcceptedAndMatch() - getWithdrawalsAcceptedAndMatch())}
                                    </div>
                                </div>
                                <div className="text-xs text-muted-foreground mt-2">
                                    Depósitos (aceptados + match MP) - Retiros aceptados
                                </div>
                            </div>
                        </div>

                        {/* Ingresos del período seleccionado (igual super-dashboard) */}
                        <div className="md:col-span-2 mt-8">
                            <div className="mb-2 text-sm font-medium">
                                {period === 'day' ? 'Ingresos del Día' :
                                    period === 'week' ? 'Ingresos de la Semana' :
                                        period === 'custom' ? 'Ingresos del Período' :
                                            'Ingresos Mensuales'}
                            </div>
                            <div className="space-y-4 p-2">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-3 bg-muted/20 rounded-md">
                                        <h4 className="text-sm font-medium mb-1">
                                            {period === 'day' ? 'Hoy' :
                                                period === 'week' ? 'Semana Actual' :
                                                    period === 'custom' ? 'Período Actual' : 'Mes Actual'}
                                        </h4>
                                        <p className="text-lg font-semibold">{formatAmount(getDepositsTotal())}</p>
                                        <p className="text-xs text-muted-foreground">{getTransactionCount('deposit', 'Aceptado') + getTransactionCount('deposit', 'Match MP')} transacciones</p>
                                    </div>
                                    <div className="p-3 bg-muted/20 rounded-md">
                                        <h4 className="text-sm font-medium mb-1">
                                            {period === 'day' ? 'Ayer' :
                                                period === 'week' ? 'Semana Anterior' :
                                                    period === 'custom' ? 'Período Anterior' : 'Mes Anterior'}
                                        </h4>
                                        <p className="text-lg font-semibold">{formatAmount(getPrevDepositsTotal())}</p>
                                        <p className="text-xs text-muted-foreground">{getPrevDepositsCount()} transacciones</p>
                                    </div>
                                    <div className="p-3 bg-muted/20 rounded-md">
                                        <h4 className="text-sm font-medium mb-1">Variación</h4>
                                        <p className="text-lg font-semibold" style={{ color: getVariation() >= 0 ? 'rgb(22, 163, 74)' : 'rgb(220, 38, 38)' }}>
                                            {getVariation() > 0 ? '+' : ''}{getVariation().toFixed(1)}%
                                        </p>
                                        <p className="text-xs text-muted-foreground">en volumen</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Distribución de transacciones (igual super-dashboard) */}
                        <div className="md:col-span-2 mt-6">
                            <h4 className="text-base font-semibold mb-3">Distribución de transacciones</h4>
                            <div className="relative pt-1">
                                <div className="flex mb-2 items-center justify-between">
                                    <div>
                                        <span className="text-xs inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200">
                                            Depósitos
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-semibold inline-block text-green-600">
                                            {formatAmount(getDepositsTotal())}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex mb-2 items-center justify-between">
                                    <div>
                                        <span className="text-xs inline-block py-1 px-2 uppercase rounded-full text-red-600 bg-red-200">
                                            Retiros
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-semibold inline-block text-red-600">
                                            {formatAmount(getWithdrawalsTotal())}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};


// --- Componentes Auxiliares (Definidos aquí para ejemplo autocontenido) ---

const SummaryCard = ({ title, value, trend, trendPositive = true, icon }: SummaryCardProps) => (
    <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-4 transition-shadow hover:shadow-md"> {/* Usando variables de shadcn */}
        <div className="flex justify-between items-start mb-2">
            <h3 className="text-muted-foreground text-sm font-medium">{title}</h3>
            <div className="text-muted-foreground">{icon}</div>
        </div>
        <div className="mb-1">
            <div className="text-3xl font-bold">{value}</div>
        </div>
        <div className={`text-sm flex items-center ${trendPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {trend} {trendPositive ? '↑' : '↓'} <span className="text-xs text-muted-foreground ml-1">vs mes anterior</span>
        </div>
    </div>
);

const Tab = ({ children, active, onClick }: TabProps) => (
    <button
        onClick={onClick}
        className={`px-3 py-2 sm:px-4 border-b-2 font-medium text-sm sm:text-base transition-colors duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${active
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`} // Usando variables de shadcn
    >
        {children}
    </button>
);

const ChartCard = ({ title, children, fullWidth = false }: ChartCardProps) => (
    // Usa col-span-2 en pantallas md o más grandes si es fullWidth
    <div className={`bg-card text-card-foreground rounded-lg border shadow-sm p-4 ${fullWidth ? 'md:col-span-2' : ''}`}>
        <h2 className="text-lg font-semibold mb-3">{title}</h2>
        {/* Asegura altura fija para ResponsiveContainer */}
        <div className="h-56 w-full">
            {children}
        </div>
    </div>
);


const SummaryCardSkeleton = () => (
    <div className="bg-card rounded-lg border shadow-sm p-4 animate-pulse">
        <div className="flex justify-between items-start mb-3">
            <Skeleton className="h-5 w-24 rounded" />
            <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <div className="mb-2">
            <Skeleton className="h-8 w-20 rounded" />
        </div>
        <Skeleton className="h-4 w-16 rounded" />
    </div>
);


// Componente Skeleton para Gráficos (NO acepta fullWidth)
const ChartSkeleton = ({ height = "h-56" }: { height?: string }) => (
    <div className={`w-full ${height} bg-card rounded-lg border shadow-sm p-4 flex flex-col animate-pulse`}>
        <Skeleton className="h-6 w-40 mb-4 rounded" />
        <div className="flex-1 flex items-center justify-center opacity-50">
            <div className="w-full h-full flex items-end justify-around p-2">
                <Skeleton className="h-[30%] w-4 rounded" /> <Skeleton className="h-[60%] w-4 rounded" />
                <Skeleton className="h-[80%] w-4 rounded" /> <Skeleton className="h-[50%] w-4 rounded" />
                <Skeleton className="h-[70%] w-4 rounded" /> <Skeleton className="h-[40%] w-4 rounded" />
            </div>
        </div>
    </div>
);
// --- Fin Componentes Auxiliares ---


export default ReportsDashboard;