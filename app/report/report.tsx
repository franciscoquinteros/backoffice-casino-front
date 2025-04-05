'use client'

import React, { useState } from 'react';
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, TooltipProps } from 'recharts';
import { Clock, Users, MessageSquare, Ticket, AlertCircle } from 'lucide-react';
import { StatusDistribution, TicketsByAgent, TicketsTrend, MessageVolume, MessageDistribution, ResponseTimeByAgent, LoginActivity, UserRole, NewUsersByMonth, DashboardSummary, ConversationStatusDistribution } from './services/report.api';
import { useTheme } from 'next-themes';
import useSWR from 'swr';
import { Skeleton } from "@/components/ui/skeleton";

// Interfaces para los props de componentes
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
    isLoading?: boolean;
    error?: string | null;
}

// Define un tipo genérico para los datos de gráficos
type ChartData = StatusDistribution[] | TicketsByAgent[] | TicketsTrend[] |
    MessageVolume[] | MessageDistribution[] | ResponseTimeByAgent[] |
    LoginActivity[] | UserRole[] | NewUsersByMonth[] | ConversationStatusDistribution[];

// Definición de colores para gráficos
const LIGHT_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
const DARK_COLORS = ['#4dabf5', '#34d399', '#fbbf24', '#fb923c', '#a78bfa'];

// Componente de Skeleton para tarjetas de resumen
const SummaryCardSkeleton = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex justify-between mb-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <Skeleton className="h-9 w-20 mb-2" />
        <Skeleton className="h-4 w-16" />
    </div>
);

// Skeleton para gráficos
const ChartSkeleton = ({ height = "h-56" }: { height?: string }) => (
    <div className={`w-full ${height} bg-white dark:bg-gray-800 rounded-lg p-4 flex flex-col`}>
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="flex-1 flex items-center justify-center">
            <div className="grid grid-cols-3 gap-2 w-full max-w-md">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        </div>
    </div>
);

// Pantalla principal de reportes
const ReportsDashboard = () => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Colores basados en el tema
    const COLORS = isDark ? DARK_COLORS : LIGHT_COLORS;

    // Estado para el tab activo
    const [activeTab, setActiveTab] = useState('tickets');

    // Personalización del tooltip para tener el texto correcto en modo oscuro
    const customTooltip = ({ active, payload }: TooltipProps<number, string>) => {
        if (active && payload && payload.length) {
            return (
                <div className={`bg-white dark:bg-gray-800 p-2 border border-gray-200 dark:border-gray-700 rounded shadow`}>
                    {payload.map((entry, index) => (
                        <div key={`item-${index}`} className="flex items-center">
                            <div
                                className="w-3 h-3 mr-2"
                                style={{ backgroundColor: entry.color }}
                            />
                            <p className="text-gray-700 dark:text-gray-200">
                                {`${entry.name}: ${entry.value}`}
                            </p>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    // Función para obtener datos con SWR
    const fetcher = async (url: string) => {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
        const response = await fetch(`${baseUrl}${url}`);
        if (!response.ok) {
            throw new Error('Error al cargar datos');
        }
        return response.json();
    };

    // Hooks SWR para cada conjunto de datos
    const { data: summaryData, error: summaryError } = useSWR<DashboardSummary>('/reports/dashboard-summary', fetcher, {
        revalidateOnFocus: false,
        revalidateIfStale: false
    });

    const { data: ticketStatusData, error: ticketStatusError } = useSWR<StatusDistribution[]>(
        '/reports/tickets-by-status',
        fetcher,
        { revalidateOnFocus: false }
    );

    const { data: ticketAgentData, error: ticketAgentError } = useSWR<TicketsByAgent[]>(
        '/reports/tickets-by-agent',
        fetcher,
        { revalidateOnFocus: false }
    );

    const { data: ticketTrendData, error: ticketTrendError } = useSWR<TicketsTrend[]>(
        '/reports/tickets-trend',
        fetcher,
        { revalidateOnFocus: false }
    );

    const { data: messageVolumeData, error: messageVolumeError } = useSWR<MessageVolume[]>(
        activeTab === 'chats' ? '/reports/messages-volume' : null,
        fetcher,
        { revalidateOnFocus: false }
    );

    const { data: conversationStatusData, error: conversationStatusError } = useSWR<ConversationStatusDistribution[]>(
        activeTab === 'chats' ? '/reports/conversation-status-distribution' : null,
        fetcher,
        { revalidateOnFocus: false }
    );

    const { data: responseTimeData, error: responseTimeError } = useSWR<ResponseTimeByAgent[]>(
        activeTab === 'chats' ? '/reports/response-time-by-agent' : null,
        fetcher,
        { revalidateOnFocus: false }
    );

    const { data: loginActivityData, error: loginActivityError } = useSWR<LoginActivity[]>(
        activeTab === 'users' ? '/reports/login-activity' : null,
        fetcher,
        { revalidateOnFocus: false }
    );

    const { data: userRolesData, error: userRolesError } = useSWR<UserRole[]>(
        activeTab === 'users' ? '/reports/user-roles' : null,
        fetcher,
        { revalidateOnFocus: false }
    );

    const { data: newUsersData, error: newUsersError } = useSWR<NewUsersByMonth[]>(
        activeTab === 'users' ? '/reports/new-users-by-month' : null,
        fetcher,
        { revalidateOnFocus: false }
    );

    // Función para renderizar un gráfico de manera segura
    const renderSafeChart = <T extends ChartData>(
        data: T | null | undefined,
        error: Error | null | undefined,
        renderFunction: (validData: T) => React.ReactNode,
        emptyMessage: string = "No hay datos disponibles"
    ): React.ReactNode => {
        if (error) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-red-500">
                    <AlertCircle className="h-10 w-10 mb-2" />
                    <p>Error al cargar datos</p>
                </div>
            );
        }

        if (!data) {
            return <ChartSkeleton />;
        }

        if (Array.isArray(data) && data.length === 0) {
            return (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    {emptyMessage}
                </div>
            );
        }

        return renderFunction(data as T);
    };

    // Verificar si los datos críticos aún se están cargando
    const isLoadingSummary = !summaryData && !summaryError;

    return (
        <>
            <h1 className="text-2xl font-bold mb-4 dark:text-white"></h1>

            {/* Tarjetas de resumen */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                {isLoadingSummary ? (
                    <>
                        <SummaryCardSkeleton />
                        <SummaryCardSkeleton />
                        <SummaryCardSkeleton />
                        <SummaryCardSkeleton />
                    </>
                ) : (
                    <>
                        <SummaryCard
                            title="Total de Tickets"
                            value={summaryData?.totalTickets?.value || 0}
                            trend={summaryData?.totalTickets?.trend || "0%"}
                            trendPositive={true}
                            icon={<Ticket className="h-8 w-8 text-blue-500" />}
                        />
                        <SummaryCard
                            title="Chats Activos"
                            value={summaryData?.activeChats?.value || 0}
                            trend={summaryData?.activeChats?.trend || "0%"}
                            trendPositive={true}
                            icon={<MessageSquare className="h-8 w-8 text-green-500" />}
                        />
                        <SummaryCard
                            title="Total de Usuarios"
                            value={summaryData?.totalUsers?.value || 0}
                            trend={summaryData?.totalUsers?.trend || "0%"}
                            trendPositive={true}
                            icon={<Users className="h-8 w-8 text-yellow-500" />}
                        />
                        <SummaryCard
                            title="Tiempo de Respuesta"
                            value={summaryData?.avgResponseTime?.value || "0m"}
                            trend={summaryData?.avgResponseTime?.trend || "0%"}
                            trendPositive={summaryData?.avgResponseTime?.trendPositive || false}
                            icon={<Clock className="h-8 w-8 text-purple-500" />}
                        />
                    </>
                )}
            </div>

            {/* Tabs de navegación */}
            <div className="flex mb-4 border-b">
                <Tab
                    active={activeTab === 'tickets'}
                    onClick={() => setActiveTab('tickets')}
                >
                    Tickets
                </Tab>
                <Tab
                    active={activeTab === 'chats'}
                    onClick={() => setActiveTab('chats')}
                >
                    Chats
                </Tab>
                <Tab
                    active={activeTab === 'users'}
                    onClick={() => setActiveTab('users')}
                >
                    Usuarios
                </Tab>
            </div>

            {/* Contenido de las tabs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeTab === 'tickets' && (
                    <>
                        <ChartCard
                            title="Estado de Tickets"
                            isLoading={!ticketStatusData && !ticketStatusError}
                            error={ticketStatusError}
                        >
                            {renderSafeChart(
                                ticketStatusData,
                                ticketStatusError,
                                (data) => (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                            <Pie
                                                data={data}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }) => `${name.length > 10 ? name.substring(0, 10) + '...' : name}: ${(percent * 100).toFixed(0)}%`}
                                                outerRadius={65}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {data.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={customTooltip} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )
                            )}
                        </ChartCard>
                        <ChartCard
                            title="Tickets por Operador"
                            isLoading={!ticketAgentData && !ticketAgentError}
                            error={ticketAgentError}
                        >
                            {renderSafeChart(
                                ticketAgentData,
                                ticketAgentError,
                                (data) => (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <BarChart
                                            data={data}
                                            layout="vertical"
                                            margin={{
                                                top: 5, right: 10, left: 60, bottom: 5,
                                            }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" />
                                            <YAxis dataKey="name" type="category" />
                                            <Tooltip content={customTooltip} />
                                            <Bar dataKey="tickets" fill={COLORS[0]}>
                                                {data.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )
                            )}
                        </ChartCard>
                        <ChartCard
                            title="Tendencia de Tickets"
                            fullWidth
                            isLoading={!ticketTrendData && !ticketTrendError}
                            error={ticketTrendError}
                        >
                            {renderSafeChart(
                                ticketTrendData,
                                ticketTrendError,
                                (data) => (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <LineChart
                                            data={data}
                                            margin={{
                                                top: 5, right: 10, left: 10, bottom: 5,
                                            }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="mes" />
                                            <YAxis />
                                            <Tooltip content={customTooltip} />
                                            <Legend />
                                            <Line
                                                type="monotone"
                                                dataKey="cantidad"
                                                name="Tickets"
                                                stroke={COLORS[0]}
                                                activeDot={{ r: 8 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                )
                            )}
                        </ChartCard>
                    </>
                )}

                {activeTab === 'chats' && (
                    <>
                        <ChartCard
                            title="Distribución de Conversaciones"
                            isLoading={!conversationStatusData && !conversationStatusError}
                            error={conversationStatusError}
                        >
                            {renderSafeChart(
                                conversationStatusData,
                                conversationStatusError,
                                (data) => (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                            <Pie
                                                data={data}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }) => `${name.length > 10 ? name.substring(0, 10) + '...' : name}: ${(percent * 100).toFixed(0)}%`}
                                                outerRadius={65}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {data.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={customTooltip} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )
                            )}
                        </ChartCard>
                        <ChartCard
                            title="Volumen de Mensajes (Hoy)"
                            isLoading={!messageVolumeData && !messageVolumeError}
                            error={messageVolumeError}
                        >
                            {renderSafeChart(
                                messageVolumeData,
                                messageVolumeError,
                                (data) => (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <LineChart
                                            data={data}
                                            margin={{
                                                top: 5, right: 10, left: 10, bottom: 5,
                                            }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="hora" />
                                            <YAxis />
                                            <Tooltip content={customTooltip} />
                                            <Legend />
                                            <Line
                                                type="monotone"
                                                dataKey="mensajes"
                                                name="Mensajes"
                                                stroke={COLORS[1]}
                                                activeDot={{ r: 8 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                )
                            )}
                        </ChartCard>
                        <ChartCard
                            title="Tiempo de Respuesta por Operador"
                            fullWidth
                            isLoading={!responseTimeData && !responseTimeError}
                            error={responseTimeError}
                        >
                            {renderSafeChart(
                                responseTimeData,
                                responseTimeError,
                                (data) => (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <BarChart
                                            data={data}
                                            layout="vertical"
                                            margin={{
                                                top: 5, right: 10, left: 60, bottom: 5,
                                            }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" />
                                            <YAxis dataKey="name" type="category" />
                                            <Tooltip content={customTooltip} />
                                            <Bar dataKey="tiempo" name="Tiempo de respuesta (min)" fill={COLORS[2]}>
                                                {data.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )
                            )}
                        </ChartCard>
                    </>
                )}

                {activeTab === 'users' && (
                    <>
                        <ChartCard
                            title="Actividad de Login (Semana actual)"
                            isLoading={!loginActivityData && !loginActivityError}
                            error={loginActivityError}
                        >
                            {renderSafeChart(
                                loginActivityData,
                                loginActivityError,
                                (data) => (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <BarChart
                                            data={data}
                                            margin={{
                                                top: 5, right: 10, left: 10, bottom: 5,
                                            }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="dia" />
                                            <YAxis />
                                            <Tooltip content={customTooltip} />
                                            <Legend />
                                            <Bar dataKey="logins" name="Inicios de sesión" fill={COLORS[3]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )
                            )}
                        </ChartCard>
                        <ChartCard
                            title="Roles de Usuario"
                            isLoading={!userRolesData && !userRolesError}
                            error={userRolesError}
                        >
                            {renderSafeChart(
                                userRolesData,
                                userRolesError,
                                (data) => (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                            <Pie
                                                data={data}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }) => `${name.length > 10 ? name.substring(0, 10) + '...' : name}: ${(percent * 100).toFixed(0)}%`}
                                                outerRadius={65}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {data.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={customTooltip} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )
                            )}
                        </ChartCard>
                        <ChartCard
                            title="Nuevos Usuarios por Mes"
                            fullWidth
                            isLoading={!newUsersData && !newUsersError}
                            error={newUsersError}
                        >
                            {renderSafeChart(
                                newUsersData,
                                newUsersError,
                                (data) => (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <LineChart
                                            data={data}
                                            margin={{
                                                top: 5, right: 10, left: 10, bottom: 5,
                                            }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="mes" />
                                            <YAxis />
                                            <Tooltip content={customTooltip} />
                                            <Legend />
                                            <Line
                                                type="monotone"
                                                dataKey="cantidad"
                                                name="Nuevos Usuarios"
                                                stroke={COLORS[4]}
                                                activeDot={{ r: 8 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                )
                            )}
                        </ChartCard>
                    </>
                )}
            </div>
        </>
    );
};

// Componentes auxiliares
const SummaryCard = ({ title, value, trend, trendPositive = true, icon }: SummaryCardProps) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</h3>
            <div className="text-gray-700 dark:text-gray-300">{icon}</div>
        </div>
        <div className="mb-1">
            <div className="text-2xl font-bold text-gray-800 dark:text-white">{value}</div>
        </div>
        <div className={`text-sm ${trendPositive ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {trend} {trendPositive ? '↑' : '↓'}
        </div>
    </div>
);

const Tab = ({ children, active, onClick }: TabProps) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 border-b-2 font-medium transition-colors ${active
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
    >
        {children}
    </button>
);

const ChartCard = ({ title, children, fullWidth = false, isLoading = false, error = null }: ChartCardProps) => (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-3 ${fullWidth ? 'col-span-full' : ''}`}>
        <h2 className="text-lg font-semibold mb-1 text-gray-800 dark:text-gray-200">{title}</h2>
        <div className="h-56 w-full overflow-hidden">
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center h-full">
                    <div className="grid grid-cols-3 gap-2 w-full max-w-md">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center h-full text-red-500">
                    <AlertCircle className="h-10 w-10 mb-2" />
                    <p>Error al cargar datos</p>
                </div>
            ) : (
                children
            )}
        </div>
    </div>
);

export default ReportsDashboard;