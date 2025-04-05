"use client";

export interface PayerIdentification {
  type: string;
  number: string;
}

export interface Transaction {
  id: string | number;
  type: 'deposit' | 'withdraw';
  amount: number;
  status: string;
  date_created: string;
  description: string;
  payment_method_id?: string;
  payer_email?: string;
  payer_identification?: PayerIdentification;
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
    let filtered;

    if (status === 'Aceptado') {
      // Para páginas "Completados", mostrar tanto aceptadas como rechazadas
      filtered = transactions.filter(tx =>
        tx.type === type &&
        (tx.status === 'Aceptado' || tx.status === 'approved' || tx.status === 'Rechazado')
      );
    } else {
      // Para otras páginas, filtrar exactamente por el estado solicitado
      filtered = transactions.filter(tx =>
        tx.type === type &&
        tx.status === status
      );
    }

    // Aplicar filtros adicionales si se proporcionan
    if (filters) {
      if (filters.office && filters.office !== 'all') {
        filtered = filtered.filter(tx => tx.office === filters.office);
      }

      if (filters.method && filters.method !== 'all') {
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

  // Rechazar una transacción
  async rejectTransaction(transaction: Transaction): Promise<Transaction> {
    try {
      // Aquí implementarías la lógica real para rechazar una transacción
      // Por ejemplo, una llamada a tu API para marcar la transacción como rechazada

      // Ejemplo de llamada a API (descomenta y adapta según tu backend)
      /*
      const endpoint = `${this.apiUrl}/proxy/${transaction.type}/reject`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_id: transaction.id.toString(),
          reason: 'rejected_by_operator'
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error al rechazar la transacción: ${response.status}`);
      }
      */

      // Por ahora, simplemente simulamos que la transacción fue rechazada
      console.log('Transacción rechazada:', transaction.id);

      // Actualizar el estado de la transacción localmente
      const updatedTransaction = {
        ...transaction,
        status: 'Rechazado',
        description: transaction.description + ' (Rechazado)'
      };

      return updatedTransaction;
    } catch (error) {
      console.error('Error al rechazar transacción:', error);
      throw error;
    }
  }
}

// Singleton para acceder al servicio desde cualquier componente
export const transactionService = new TransactionService();