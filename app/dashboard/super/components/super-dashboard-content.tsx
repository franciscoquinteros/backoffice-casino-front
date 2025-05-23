"use client";

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    RefreshCw,
    Search,
    DownloadCloud
} from 'lucide-react';
import OfficeFilter from './office-filter';
import TransactionsList from './transactions-list';
import UsersList from './users-list';
import AccountsList from './accounts-list';
import { OfficesContent } from '../offices/offices-content';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';

// Tipos de filtros
import { TransactionFilters } from '../hooks/use-all-transactions';
import { UserFilters } from '../hooks/use-all-users';
import { AccountFilters } from '../hooks/use-all-accounts';

import { useDashboardStats, DateFilter } from '../hooks/use-dashboard-stats';
import { formatCurrency } from '@/lib/utils';

// Importamos las ventanas modales para crear usuarios y cuentas
import { CreateUserModal } from '@/app/dashboard/users/create-user-modal';
import { CreateTransferAccountModal } from '@/components/transfer-accounts/create-transfer-account-modal';

export default function SuperDashboardContent() {
    // Estado para el filtro de oficinas que será compartido entre todas las pestañas
    const [selectedOffice, setSelectedOffice] = useState<string | null>(null);

    // Estados para fechas de transacciones
    const [fromDate, setFromDate] = useState<string>('');
    const [toDate, setToDate] = useState<string>('');

    // Estados para controlar refresh y loading
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

    // Estados para los demás filtros por sección
    const [transactionFilters, setTransactionFilters] = useState<TransactionFilters>({
        officeId: null,
        type: null,
        status: null,
        search: null,
        date: { from: null, to: null }
    });

    const [userFilters, setUserFilters] = useState<UserFilters>({
        officeId: null,
        role: null,
        status: null,
        search: null
    });

    const [accountFilters, setAccountFilters] = useState<AccountFilters>({
        officeId: null,
        status: null,
        search: null
    });

    // Estado para el término de búsqueda compartido
    const [searchTerm, setSearchTerm] = useState<string>('');

    // Función para manejar el cambio de oficina (afecta a todos los filtros)
    const handleOfficeChange = (officeId: string | null) => {
        setSelectedOffice(officeId);
        setTransactionFilters(prev => ({ ...prev, officeId }));
        setUserFilters(prev => ({ ...prev, officeId }));
        setAccountFilters(prev => ({ ...prev, officeId }));
    };

    // Función para aplicar filtros de búsqueda
    const applySearchFilter = (tabId: string) => {
        switch (tabId) {
            case 'transactions':
                setTransactionFilters(prev => ({
                    ...prev,
                    search: searchTerm || null,
                    date: {
                        from: fromDate || null,
                        to: toDate || null
                    }
                }));
                break;
            case 'users':
                setUserFilters(prev => ({ ...prev, search: searchTerm || null }));
                break;
            case 'accounts':
                setAccountFilters(prev => ({ ...prev, search: searchTerm || null }));
                break;
        }
    };

    // Función para restablecer todos los filtros
    const resetFilters = (tabId: string) => {
        switch (tabId) {
            case 'transactions':
                setTransactionFilters({
                    officeId: selectedOffice,
                    type: null,
                    status: null,
                    search: null,
                    date: { from: null, to: null }
                });
                setFromDate('');
                setToDate('');
                break;
            case 'users':
                setUserFilters({
                    officeId: selectedOffice,
                    role: null,
                    status: null,
                    search: null
                });
                break;
            case 'accounts':
                setAccountFilters({
                    officeId: selectedOffice,
                    status: null,
                    search: null
                });
                break;
        }
        setSearchTerm('');
    };

    // Funciones para recargar datos después de crear un usuario o cuenta
    const handleUserCreated = async () => {
        // Recargar la lista de usuarios
        console.log("Recargando usuarios...");
        // Aquí podrías tener una función para recargar los datos
    };

    const handleAccountCreated = async () => {
        // Recargar la lista de cuentas
        console.log("Recargando cuentas...");
        // Aquí podrías tener una función para recargar los datos
    };

    // Función para manejar el refresh de transacciones
    const handleRefreshTransactions = () => {
        setIsRefreshing(true);
        // Force re-fetch by updating filters with a timestamp
        setTransactionFilters(prev => ({
            ...prev,
            _refresh: Date.now()
        } as TransactionFilters & { _refresh?: number }));
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    // Función para exportar transacciones
    const handleExportTransactions = () => {
        // Esta función será llamada desde el componente TransactionsList
        // Trigger export by setting a flag
        setTransactionFilters(prev => ({
            ...prev,
            _export: Date.now()
        } as TransactionFilters & { _export?: number }));
    };

    return (
        <div>
            {/* Selector de oficina global */}
            <div className="flex justify-end mb-4">
                <OfficeFilter
                    onChange={handleOfficeChange}
                    selectedOffice={selectedOffice}
                />
            </div>

            {/* Tabs para las diferentes secciones */}
            <Tabs defaultValue="transactions" className="space-y-4">
                <TabsList className="grid grid-cols-5 mb-4">
                    <TabsTrigger value="transactions">Transacciones</TabsTrigger>
                    <TabsTrigger value="users">Usuarios</TabsTrigger>
                    <TabsTrigger value="accounts">Cuentas</TabsTrigger>
                    <TabsTrigger value="offices">Oficinas</TabsTrigger>
                    <TabsTrigger value="reports">Reportes</TabsTrigger>
                </TabsList>

                {/* Sección de Transacciones */}
                <TabsContent value="transactions" className="space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <CardTitle>Transacciones</CardTitle>
                                    <CardDescription>
                                        Vista centralizada de todas las transacciones en el sistema
                                    </CardDescription>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar transacción..."
                                            className="pl-8 w-full md:w-[250px]"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && applySearchFilter('transactions')}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <div>
                                                <Input
                                                    type="date"
                                                    placeholder="Desde"
                                                    value={fromDate}
                                                    onChange={(e) => setFromDate(e.target.value)}
                                                    className="w-full sm:w-[150px]"
                                                />
                                            </div>
                                            <div>
                                                <Input
                                                    type="date"
                                                    placeholder="Hasta"
                                                    value={toDate}
                                                    onChange={(e) => setToDate(e.target.value)}
                                                    className="w-full sm:w-[150px]"
                                                />
                                            </div>
                                        </div>
                                        <Select
                                            value={transactionFilters.type || "all"}
                                            onValueChange={(value) => setTransactionFilters((prev) => ({
                                                ...prev,
                                                type: value === "all" ? null : value as 'deposit' | 'withdraw'
                                            }))}
                                        >
                                            <SelectTrigger className="w-[130px]">
                                                <SelectValue placeholder="Tipo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todos</SelectItem>
                                                <SelectItem value="deposit">Depósito</SelectItem>
                                                <SelectItem value="withdraw">Retiro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={transactionFilters.status || "all"}
                                            onValueChange={(value) => setTransactionFilters((prev) => ({
                                                ...prev,
                                                status: value === "all" ? null : value
                                            }))}
                                        >
                                            <SelectTrigger className="w-[130px]">
                                                <SelectValue placeholder="Estado" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todos</SelectItem>
                                                <SelectItem value="Pending">Pendiente</SelectItem>
                                                <SelectItem value="Asignado">Asignado</SelectItem>
                                                <SelectItem value="Aceptado">Aprobado</SelectItem>
                                                <SelectItem value="Rechazado">Rechazado</SelectItem>
                                                <SelectItem value="Match MP">Match MP</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => applySearchFilter('transactions')}
                                        >
                                            <Search className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleRefreshTransactions}
                                            disabled={isRefreshing}
                                        >
                                            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleExportTransactions}
                                        >
                                            <DownloadCloud className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <TransactionsList filters={transactionFilters} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Sección de Usuarios */}
                <TabsContent value="users" className="space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <CardTitle>Usuarios</CardTitle>
                                    <CardDescription>
                                        Gestión centralizada de todos los usuarios en el sistema
                                    </CardDescription>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar usuario..."
                                            className="pl-8 w-full md:w-[250px]"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && applySearchFilter('users')}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Select
                                            value={userFilters.role || "all"}
                                            onValueChange={(value) => setUserFilters((prev) => ({
                                                ...prev,
                                                role: value === "all" ? null : value
                                            }))}
                                        >
                                            <SelectTrigger className="w-[130px]">
                                                <SelectValue placeholder="Rol" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todos</SelectItem>
                                                <SelectItem value="admin">Admin</SelectItem>
                                                <SelectItem value="operador">Operador</SelectItem>
                                                <SelectItem value="encargado">Encargado</SelectItem>
                                                <SelectItem value="superadmin">Superadmin</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={userFilters.status || "all"}
                                            onValueChange={(value) => setUserFilters((prev) => ({
                                                ...prev,
                                                status: value === "all" ? null : value
                                            }))}
                                        >
                                            <SelectTrigger className="w-[130px]">
                                                <SelectValue placeholder="Estado" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todos</SelectItem>
                                                <SelectItem value="active">Activo</SelectItem>
                                                <SelectItem value="inactive">Inactivo</SelectItem>
                                                <SelectItem value="suspended">Suspendido</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => applySearchFilter('users')}
                                        >
                                            <Search className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => resetFilters('users')}
                                        >
                                            <RefreshCw className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon">
                                            <DownloadCloud className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <CreateUserModal onUserCreated={handleUserCreated} userType="internal" allowOfficeSelection={true} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <UsersList filters={userFilters} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Sección de Cuentas */}
                <TabsContent value="accounts" className="space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <CardTitle>Cuentas</CardTitle>
                                    <CardDescription>
                                        Gestión centralizada de todas las cuentas bancarias en el sistema
                                    </CardDescription>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar cuenta..."
                                            className="pl-8 w-full md:w-[250px]"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && applySearchFilter('accounts')}
                                        />
                                    </div>
                                    <Select
                                        value={accountFilters.status || "all"}
                                        onValueChange={(value) => setAccountFilters((prev) => ({
                                            ...prev,
                                            status: value === "all" ? null : value
                                        }))}
                                    >
                                        <SelectTrigger className="w-[130px]">
                                            <SelectValue placeholder="Estado" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos</SelectItem>
                                            <SelectItem value="active">Activa</SelectItem>
                                            <SelectItem value="disabled">Desactivada</SelectItem>
                                            <SelectItem value="suspended">Suspendida</SelectItem>
                                            <SelectItem value="pending">Pendiente</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => applySearchFilter('accounts')}
                                        >
                                            <Search className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => resetFilters('accounts')}
                                        >
                                            <RefreshCw className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon">
                                            <DownloadCloud className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <CreateTransferAccountModal onAccountCreated={handleAccountCreated} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <AccountsList filters={accountFilters} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Sección de Oficinas */}
                <TabsContent value="offices" className="space-y-4">
                    <Card>
                        <CardContent>
                            <OfficesContent />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Sección de Reportes */}
                <TabsContent value="reports" className="space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <CardTitle>Reportes</CardTitle>
                                    <CardDescription>
                                        {selectedOffice
                                            ? `Análisis y estadísticas para la oficina seleccionada`
                                            : `Análisis y estadísticas del sistema completo`}
                                    </CardDescription>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <div className="text-sm text-muted-foreground mr-2">
                                        {selectedOffice
                                            ? `Mostrando datos filtrados por oficina`
                                            : `Mostrando datos globales`}
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ReportsContent selectedOffice={selectedOffice} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function ReportsContent({ selectedOffice }: { selectedOffice: string | null }) {
    // Estados para los filtros de fecha
    const [dateFilter, setDateFilter] = useState<DateFilter>({
        period: 'month' // Por defecto, mostrar datos del mes
    });
    const [customFromDate, setCustomFromDate] = useState<string>('');
    const [customToDate, setCustomToDate] = useState<string>('');

    const { stats, isLoading, error } = useDashboardStats(selectedOffice, dateFilter);

    // Función para manejar cambios en el período de tiempo
    const handlePeriodChange = (period: 'day' | 'week' | 'month' | 'custom') => {
        if (period === 'custom') {
            setDateFilter({
                period: 'custom',
                from: customFromDate || null,
                to: customToDate || null
            });
        } else {
            setDateFilter({ period });
        }
    };

    // Función para manejar cambios en las fechas personalizadas
    const handleCustomDateChange = () => {
        setDateFilter({
            period: 'custom',
            from: customFromDate || null,
            to: customToDate || null
        });
    };

    // Función para exportar los datos de reportes a CSV
    const exportReportToCSV = () => {
        if (!stats) return;

        try {
            // Determinar el nombre del archivo
            const date = new Date().toISOString().split('T')[0];
            const fileName = selectedOffice
                ? `reporte_oficina_${selectedOffice}_${date}.csv`
                : `reporte_global_${date}.csv`;

            let csvContent = '';

            // Datos globales
            csvContent += 'Tipo,Valor\n';
            csvContent += `Depósitos,${stats.deposits?.amount || 0}\n`;
            csvContent += `Retiros,${stats.withdrawals?.amount || 0}\n`;
            csvContent += `Total Neto,${stats.netTotal || 0}\n`;
            csvContent += `Número de Depósitos,${stats.deposits?.total || 0}\n`;
            csvContent += `Depósitos Aceptados,${stats.deposits?.accepted || 0}\n`;
            csvContent += `Depósitos Pendientes,${stats.deposits?.pending || 0}\n`;
            csvContent += `Depósitos Rechazados,${stats.deposits?.rejected || 0}\n`;
            csvContent += `Número de Retiros,${stats.withdrawals?.total || 0}\n`;
            csvContent += `Retiros Aceptados,${stats.withdrawals?.accepted || 0}\n`;
            csvContent += `Retiros Pendientes,${stats.withdrawals?.pending || 0}\n`;
            csvContent += `Retiros Rechazados,${stats.withdrawals?.rejected || 0}\n`;
            csvContent += `Variación Mensual (%),${stats.monthlyTrend?.amountChange || 0}\n\n`;

            // Si es un reporte global, añadir datos por oficina
            if (!selectedOffice && stats.byOffice) {
                csvContent += '\nDatos por Oficina\n';
                csvContent += 'Oficina,Depósitos,Retiros,Total\n';

                Object.entries(stats.byOffice || {}).forEach(([officeId, officeStats]: [string, { depositsAmount?: number; withdrawalsAmount?: number; totalAmount?: number }]) => {
                    csvContent += `${officeId},${officeStats.depositsAmount || 0},${officeStats.withdrawalsAmount || 0},${officeStats.totalAmount || 0}\n`;
                });
            }



            // Crear blob y descargarlo
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log('Reporte exportado con éxito');
        } catch (error) {
            console.error('Error al exportar el reporte:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="w-full flex justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 border border-red-300 rounded-md bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800">
                Error al cargar estadísticas: {error}
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="p-4 text-center text-muted-foreground">
                No hay datos estadísticos disponibles.
            </div>
        );
    }

    // Formatear porcentajes para mostrar
    const formatPercentage = (value?: number) => {
        if (value === undefined) return '0%';
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value.toFixed(1)}%`;
    };



    // Renderizar contenido de estadísticas
    return (
        <div>
            {/* Filtros de fecha y controles */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Período:</label>
                        <Select
                            value={dateFilter.period || 'month'}
                            onValueChange={(value) => handlePeriodChange(value as 'day' | 'week' | 'month' | 'custom')}
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
                    </div>

                    {/* Filtros de fecha personalizada */}
                    {dateFilter.period === 'custom' && (
                        <div className="flex items-center gap-2">
                            <Input
                                type="date"
                                value={customFromDate}
                                onChange={(e) => setCustomFromDate(e.target.value)}
                                className="w-[150px]"
                                placeholder="Desde"
                            />
                            <span className="text-sm text-muted-foreground">hasta</span>
                            <Input
                                type="date"
                                value={customToDate}
                                onChange={(e) => setCustomToDate(e.target.value)}
                                className="w-[150px]"
                                placeholder="Hasta"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCustomDateChange}
                            >
                                Aplicar
                            </Button>
                        </div>
                    )}
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={exportReportToCSV}
                >
                    <DownloadCloud className="mr-2 h-4 w-4" />
                    Exportar datos
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Tarjeta: Depósitos */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                            Depósitos
                            {selectedOffice && <span className="text-xs font-normal ml-1 text-muted-foreground">(Oficina)</span>}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.deposits?.amount || 0)}</div>
                        <div className="flex justify-between mt-1">
                            <p className="text-xs">{stats.deposits?.total || 0} operaciones</p>
                            <p className="text-xs">
                                <span className="text-green-600 dark:text-green-400">{stats.deposits?.accepted || 0} aceptados</span> •
                                <span className="text-yellow-600 dark:text-yellow-400 mx-1">{stats.deposits?.pending || 0} pendientes</span> •
                                <span className="text-red-600 dark:text-red-400">{stats.deposits?.rejected || 0} rechazados</span>
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Tarjeta: Retiros */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                            Retiros
                            {selectedOffice && <span className="text-xs font-normal ml-1 text-muted-foreground">(Oficina)</span>}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.withdrawals?.amount || 0)}</div>
                        <div className="flex justify-between mt-1">
                            <p className="text-xs">{stats.withdrawals?.total || 0} operaciones</p>
                            <p className="text-xs">
                                <span className="text-green-600 dark:text-green-400">{stats.withdrawals?.accepted || 0} aceptados</span> •
                                <span className="text-yellow-600 dark:text-yellow-400 mx-1">{stats.withdrawals?.pending || 0} pendientes</span> •
                                <span className="text-red-600 dark:text-red-400">{stats.withdrawals?.rejected || 0} rechazados</span>
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Tarjeta: Total (Depósitos - Retiros) */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Neto
                            {selectedOffice && <span className="text-xs font-normal ml-1 text-muted-foreground">(Oficina)</span>}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${(stats.netTotal || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(stats.netTotal || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Depósitos - Retiros
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {formatPercentage(stats.monthlyTrend?.amountChange)} respecto al mes anterior
                        </p>
                    </CardContent>
                </Card>

                {/* Tarjeta: Ingresos por Oficina o Mensuales */}
                <Card className="md:col-span-3">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                            {selectedOffice ? "Ingresos Mensuales" : "Ingresos por Oficina"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {selectedOffice ? (
                            // Si hay oficina seleccionada, mostrar datos mensuales
                            <div className="space-y-4 p-2">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-3 bg-muted/20 rounded-md">
                                        <h4 className="text-sm font-medium mb-1">Mes Actual</h4>
                                        <p className="text-lg font-semibold">{formatCurrency(stats.monthlyTrend?.currentMonth?.amount || 0)}</p>
                                        <p className="text-xs text-muted-foreground">{stats.monthlyTrend?.currentMonth?.count || 0} transacciones</p>
                                    </div>
                                    <div className="p-3 bg-muted/20 rounded-md">
                                        <h4 className="text-sm font-medium mb-1">Mes Anterior</h4>
                                        <p className="text-lg font-semibold">{formatCurrency(stats.monthlyTrend?.previousMonth?.amount || 0)}</p>
                                        <p className="text-xs text-muted-foreground">{stats.monthlyTrend?.previousMonth?.count || 0} transacciones</p>
                                    </div>
                                    <div className="p-3 bg-muted/20 rounded-md">
                                        <h4 className="text-sm font-medium mb-1">Variación</h4>
                                        <p className="text-lg font-semibold" style={{
                                            color: (stats.monthlyTrend?.amountChange || 0) >= 0 ? 'rgb(22, 163, 74)' : 'rgb(220, 38, 38)'
                                        }}>
                                            {formatPercentage(stats.monthlyTrend?.amountChange)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">en volumen</p>
                                    </div>
                                </div>
                                <div className="mt-6 border-t pt-4">
                                    <h4 className="text-sm font-medium mb-3">Distribución de transacciones</h4>
                                    <div className="relative pt-1">
                                        <div className="flex mb-2 items-center justify-between">
                                            <div>
                                                <span className="text-xs inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200">
                                                    Depósitos
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs font-semibold inline-block text-green-600">
                                                    {formatCurrency(stats.deposits?.amount || 0)}
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
                                                    {formatCurrency(stats.withdrawals?.amount || 0)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // Si no hay oficina, mostrar tabla de ingresos por oficina
                            <div className="space-y-1">
                                {stats.byOffice && Object.keys(stats.byOffice).length > 0 ? (
                                    <div className="space-y-2">
                                        {Object.entries(stats.byOffice || {}).map(([officeId, officeStats]) => (
                                            <div key={officeId} className="flex items-center justify-between p-2 border-b">
                                                <div className="font-medium">Oficina {officeId}</div>
                                                <div className="space-x-4 flex">
                                                    <div>
                                                        <span className="text-xs text-muted-foreground">Depósitos: </span>
                                                        <span className="font-medium">{formatCurrency(officeStats?.depositsAmount || 0)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs text-muted-foreground">Retiros: </span>
                                                        <span className="font-medium">{formatCurrency(officeStats?.withdrawalsAmount || 0)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs text-muted-foreground">Total: </span>
                                                        <span className="font-medium">{formatCurrency(officeStats?.totalAmount || 0)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center p-4 text-muted-foreground">
                                        No hay datos de oficinas disponibles
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>


            </div>
        </div>
    );
} 