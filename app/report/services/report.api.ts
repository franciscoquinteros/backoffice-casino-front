import axios from 'axios';

// Define la URL base de la API
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Interfaces para los tipos de datos de respuesta
export interface StatusDistribution {
    name: string;
    value: number;
}

export interface TicketsByAgent {
    name: string;
    tickets: number;
}

export interface TicketsTrend {
    mes: string;
    cantidad: number;
}

export interface MessageVolume {
    hora: string;
    mensajes: number;
}

export interface MessageDistribution {
    name: string;
    value: number;
}

export interface ResponseTimeByAgent {
    name: string;
    tiempo: number;
}

export interface LoginActivity {
    dia: string;
    logins: number;
}

export interface UserRole {
    name: string;
    value: number;
}

export interface NewUsersByMonth {
    mes: string;
    cantidad: number;
}

export interface ConversationStatusDistribution {
    name: string;
    value: number;
}

export interface DashboardSummary {
    totalTickets: {
        value: number;
        trend: string;
    };
    activeChats: {
        value: number;
        trend: string;
    };
    totalUsers: {
        value: number;
        trend: string;
    };
    avgResponseTime: {
        value: string;
        trend: string;
        trendPositive: boolean;
    };
}

export interface TransactionSummary {
    totalDeposits: {
        value: number;
        trend: string;
    };
    totalWithdrawals: {
        value: number;
        trend: string;
    };
    pendingDeposits: {
        value: number;
        trend: string;
    };
    pendingWithdrawals: {
        value: number;
        trend: string;
    };
}

export interface TransactionByStatus {
    name: string;
    value: number;
}

export interface TransactionTrendData {
    mes: string;
    cantidad: number;
}

export interface TransactionTrend {
    deposits: TransactionTrendData[];
    withdraws: TransactionTrendData[];
}

export interface TransactionByAgent {
    name: string;
    id: string;
    value: number;
}

// Clase para manejar las llamadas a la API
class ReportApi {
    private axiosInstance = axios.create({
        baseURL: API_BASE_URL,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    async getTicketsByStatus(): Promise<StatusDistribution[]> {
        try {
            const response = await this.axiosInstance.get('/reports/tickets-by-status');
            return response.data;
        } catch (error) {
            console.error('Error fetching tickets by status:', error);
            throw error;
        }
    }

    async getTicketsByAgent(): Promise<TicketsByAgent[]> {
        try {
            const response = await this.axiosInstance.get('/reports/tickets-by-agent');
            return response.data;
        } catch (error) {
            console.error('Error fetching tickets by agent:', error);
            throw error;
        }
    }

    async getTicketsTrend(): Promise<TicketsTrend[]> {
        try {
            const response = await this.axiosInstance.get('/reports/tickets-trend');
            return response.data;
        } catch (error) {
            console.error('Error fetching tickets trend:', error);
            throw error;
        }
    }

    async getMessageVolume(): Promise<MessageVolume[]> {
        try {
            const response = await this.axiosInstance.get('/reports/messages-volume');
            return response.data;
        } catch (error) {
            console.error('Error fetching message volume:', error);
            throw error;
        }
    }

    async getMessageDistribution(): Promise<MessageDistribution[]> {
        try {
            const response = await this.axiosInstance.get('/reports/messages-distribution');
            return response.data;
        } catch (error) {
            console.error('Error fetching message distribution:', error);
            throw error;
        }
    }

    async getConversationStatusDistribution(): Promise<ConversationStatusDistribution[]> {
        try {
            const response = await this.axiosInstance.get('/reports/conversation-status-distribution');
            return response.data;
        } catch (error) {
            console.error('Error fetching conversation status distribution:', error);
            throw error;
        }
    }

    async getResponseTimeByAgent(): Promise<ResponseTimeByAgent[]> {
        try {
            const response = await this.axiosInstance.get('/reports/response-time-by-agent');
            return response.data;
        } catch (error) {
            console.error('Error fetching response time by agent:', error);
            throw error;
        }
    }

    async getLoginActivity(): Promise<LoginActivity[]> {
        try {
            const response = await this.axiosInstance.get('/reports/login-activity');
            return response.data;
        } catch (error) {
            console.error('Error fetching login activity:', error);
            throw error;
        }
    }

    async getUserRoles(): Promise<UserRole[]> {
        try {
            const response = await this.axiosInstance.get('/reports/user-roles');
            return response.data;
        } catch (error) {
            console.error('Error fetching user roles:', error);
            throw error;
        }
    }

    async getNewUsersByMonth(): Promise<NewUsersByMonth[]> {
        try {
            const response = await this.axiosInstance.get('/reports/new-users-by-month');
            return response.data;
        } catch (error) {
            console.error('Error fetching new users by month:', error);
            throw error;
        }
    }

    async getDashboardSummary(): Promise<DashboardSummary> {
        try {
            const response = await this.axiosInstance.get('/reports/dashboard-summary');
            return response.data;
        } catch (error) {
            console.error('Error fetching dashboard summary:', error);
            throw error;
        }
    }
}

// Exportar una instancia singleton para usar en toda la aplicación
export const reportApi = new ReportApi();