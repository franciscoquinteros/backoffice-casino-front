// types/tickets.ts
// Definición compartida de tipos para tickets

export interface Ticket {
    id: number;
    subject: string;
    description?: string;
    status?: string;
    created_at?: string;
    updated_at?: string;
    requester_id?: string | number;
    assignee_id?: string | number;
    user?: {
        name?: string;
        email?: string;
    };
    internal_assignee?: {
        id: string | number;
        name?: string;
        username?: string;
        email?: string;
    };
    group_id?: string | number;
    custom_fields?: string[];
}


export interface TicketFilter {
    status?: string;
    agentId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
}

export interface Operator {
    id: string | number;
    username: string;
    email?: string;
    ticketCount?: number;
}