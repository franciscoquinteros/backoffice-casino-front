// app/components/transaction-service.ts
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
      const response = await fetch(`${this.apiUrl}/transactions`);

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
  // components/transaction-service.ts
// Añadir al final de la clase TransactionService

async approveTransaction(transaction: Transaction): Promise<{success: boolean, transaction?: Transaction, error?: string}> {
  const opId = `fe_approve_${transaction.id}_${Date.now()}`;
  console.log(`[${opId}] INICIO: Aprobando transacción frontend:`, transaction.id);
  
  try {
    const transactionType = transaction.type;
    const endpoint = `${this.apiUrl}/transactions/${transactionType}/${transaction.id}/accept`;
    console.log(`[${opId}] Enviando solicitud a endpoint:`, endpoint);

    const payload = {
      amount: transaction.amount,
      idClient: transaction.idCliente?.toString() || '',
      idTransaction: transaction.id.toString(),
    };
    console.log(`[${opId}] Payload de la solicitud:`, payload);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();
    console.log(`[${opId}] Respuesta recibida:`, responseData);
    
    if (!response.ok) {
      // Extraer el mensaje de error de la respuesta si existe
      const errorMsg = responseData.message || 
                       responseData.error || 
                       `Error al confirmar la transacción: ${response.status}`;
      console.error(`[${opId}] ERROR: ${errorMsg}`);
      return { 
        success: false, 
        error: errorMsg 
      };
    }

    console.log(`[${opId}] FIN: Transacción aprobada, respuesta:`, responseData);
    
    return { 
      success: true, 
      transaction: responseData.transaction
    };
  } catch (error: any) {
    console.error(`[${opId}] ERROR: Error al aprobar transacción:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Error al procesar la transacción';
    return { 
      success: false, 
      error: errorMessage
    };
  }
}

  // Rechazar una transacción
  async rejectTransaction(transaction: Transaction): Promise<Transaction> {
    try {
      // Llamar al endpoint de rechazo con el ID de la transacción
      const transactionType = transaction.type;
      const endpoint = `${this.apiUrl}/transactions/${transactionType}/${transaction.id}/reject`;

      console.log(`Rechazando transacción: ${transaction.id} - Endpoint: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Error al rechazar la transacción: ${response.status}`);
      }

      // Obtener la transacción actualizada de la respuesta
      const responseData = await response.json();
      return responseData.transaction;
    } catch (error) {
      console.error('Error al rechazar transacción:', error);

      // Simulación para desarrollo - eliminar en producción
      console.log('Modo simulación: Rechazando localmente');
      const rejectedTransaction = {
        ...transaction,
        status: 'Rechazado',
        description: transaction.description + ' (Rechazado)'
      };

      return rejectedTransaction;
    }
  }
}

// Singleton para acceder al servicio desde cualquier componente
export const transactionService = new TransactionService();