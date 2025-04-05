// app/components/transaction-service.ts
"use client";

export interface Transaction {
    id: string | number;
    type: 'deposit' | 'withdraw';
    amount: number;
    status: string;
    date_created: string;
    description: string;
    payment_method_id?: string;
    payer_email?: string;
    payer_identification?: any;
    external_reference?: string;
    cbu?: string;
    wallet_address?: string;
    receiver_id?: string;
    idCliente?: string | number;
    reference_transaction?: string;
    office?: string; // Campo opcional para la oficina
}

export interface TransactionFilter {
    office?: string;
    method?: string;
    minAmount?: number;
    maxAmount?: number;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
}

class TransactionService {
    private apiUrl: string;

    constructor() {
        this.apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    }

    // Obtener todas las transacciones
    async getTransactions(): Promise<Transaction[]> {
        try {
            const response = await fetch(`${this.apiUrl}/ipn/transactions`);

            if (!response.ok) {
                throw new Error(`Error al obtener transacciones: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error obteniendo transacciones:', error);
            throw error;
        }
    }

    // Filtrar transacciones por tipo y estado
    filterTransactions(
        transactions: Transaction[],
        type: 'deposit' | 'withdraw',
        status: string,
        filters?: TransactionFilter
    ): Transaction[] {
        let filtered = transactions.filter(tx =>
            tx.type === type &&
            tx.status === status
        );

        // Aplicar filtros adicionales si se proporcionan
        if (filters) {
            if (filters.office) {
                filtered = filtered.filter(tx => tx.office === filters.office);
            }

            if (filters.method) {
                filtered = filtered.filter(tx => tx.payment_method_id === filters.method);
            }

            // Corregir los errores de TypeScript comprobando explícitamente si es undefined
            if (filters.minAmount !== undefined) {
                filtered = filtered.filter(tx => tx.amount >= filters.minAmount!);
            }

            if (filters.maxAmount !== undefined) {
                filtered = filtered.filter(tx => tx.amount <= filters.maxAmount!);
            }

            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                filtered = filtered.filter(tx =>
                    (tx.id.toString().toLowerCase().includes(searchLower)) ||
                    (tx.payer_email && tx.payer_email.toLowerCase().includes(searchLower)) ||
                    (tx.idCliente && tx.idCliente.toString().toLowerCase().includes(searchLower))
                );
            }

            if (filters.dateFrom) {
                const fromDate = new Date(filters.dateFrom);
                filtered = filtered.filter(tx => new Date(tx.date_created) >= fromDate);
            }

            if (filters.dateTo) {
                const toDate = new Date(filters.dateTo);
                filtered = filtered.filter(tx => new Date(tx.date_created) <= toDate);
            }
        }

        return filtered;
    }

    // Aprobar una transacción
    async approveTransaction(transaction: Transaction): Promise<Transaction> {
        try {
            const transactionType = transaction.type;
            const endpoint = `${this.apiUrl}/proxy/${transactionType}`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: transaction.idCliente || '',
                    amount: transaction.amount,
                    transaction_id: transaction.id.toString()
                }),
            });

            if (!response.ok) {
                throw new Error(`Error al confirmar la transacción: ${response.status}`);
            }

            const updatedTransaction = { ...transaction, status: 'Aceptado' };
            return updatedTransaction;
        } catch (error) {
            console.error('Error al aprobar transacción:', error);
            throw error;
        }
    }
}

// Singleton para acceder al servicio desde cualquier componente
export const transactionService = new TransactionService();