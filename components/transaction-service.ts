// app/components/transaction-service.ts
"use client";

import { useSession } from "next-auth/react"

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
  updated_at?: string;
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
  account_name?: string; // Nombre de la cuenta asociada
  assignedTo?: string; // ID del usuario asignado a la transacción
  username?: string; // Username del usuario (viene del campo username de la request)
  phoneNumber?: string; // Número de WhatsApp (viene del campo NumeroDeWhatsapp de la request)

  // Nuevos campos que pueden venir del backend después de cambios
  client_id?: string | number; // Alternativa a idCliente
  reference_id?: string; // Alternativa a external_reference
  reference?: string; // Otra alternativa para referencia
  transaction_reference?: string; // Otra posible referencia
  account_number?: string; // Número de cuenta alternativo
  account?: string; // Información de cuenta genérica
  account_holder?: string; // Alternativa a account_name
  // Cualquier otro campo que pueda venir en el formato nuevo
}

export interface TransactionFilter {
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  reference?: string;
}

export interface TransactionUpdateInfo {
  externalBalance?: number;
  description?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface TransactionOperationResult {
  success: boolean;
  transaction?: Transaction; // Devuelve la transacción actualizada en caso de éxito
  error?: string; // Devuelve un mensaje de error en caso de fallo
}

// Define una interfaz para el resultado de approveTransaction
export interface ApproveTransactionResult {
  success: boolean;
  transaction?: Transaction;
  error?: string;
}

class TransactionService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
  }

  // Obtener todas las transacciones

  /**
   * Obtiene las transacciones para una oficina específica desde el backend.
   * Requiere el ID de la oficina y el token de acceso del usuario.
   * @param officeId - El ID de la oficina para la cual obtener transacciones.
   * @param accessToken - El token JWT del usuario autenticado.
   * @returns Promise<Transaction[]> - Un array de transacciones para esa oficina.
   */
  async getTransactionsForOffice(officeId: string, accessToken: string): Promise<Transaction[]> {
    if (!officeId) {
      console.error('getTransactionsForOffice: officeId is required');
      throw new Error('Office ID is required to fetch transactions.');
    }
    if (!accessToken) {
      console.error('getTransactionsForOffice: accessToken is required');
      throw new Error('Authentication token is required.');
    }
    if (!this.apiUrl) {
      throw new Error('API URL is not configured.');
    }

    try {
      // Construye la URL correcta del endpoint del backend
      const endpoint = `${this.apiUrl}/transactions/${encodeURIComponent(officeId)}`;
      console.log(`[FE Service] Fetching transactions from: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        let errorMsg = `Error fetching transactions: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorData.error || errorMsg;
        } catch { }

        console.error(`getTransactionsForOffice Error (${response.status}): ${errorMsg}`);
        throw new Error(errorMsg);
      }

      const data: Transaction[] = await response.json();
      console.log(`[FE Service] Received ${data.length} transactions for office ${officeId}`);

      // Procesar los datos recibidos para normalizar propiedades para cada transacción
      const processedData = data.map(tx => {
        // Crear una copia de la transacción
        const processedTx = { ...tx };

        // Para transacciones no Bank Transfer (como IPN)
        if (tx.description !== 'Bank Transfer') {
          // Si viene accountName pero no account_name, asignar el valor
          if ((tx as { accountName?: string }).accountName && !tx.account_name) {
            processedTx.account_name = (tx as { accountName?: string }).accountName;
          }

          // Para cualquier transacción sin account_name, asignar un valor por defecto
          if (!processedTx.account_name && tx.account_holder) {
            processedTx.account_name = tx.account_holder;
          }

          // Solo usar 'No disponible' como último recurso
          if (!processedTx.account_name) {
            processedTx.account_name = 'No disponible';
          }
        }

        return processedTx;
      });

      return processedData;
    } catch (error) {
      console.error('Error during getTransactionsForOffice fetch:', error);
      throw error;
    }
  }

  // Método para aplicar filtros adicionales
  applyFilters(transactions: Transaction[], filters?: TransactionFilter): Transaction[] {
    if (!filters) return transactions;

    console.log(`🔍 [ApplyFilters] Iniciando filtrado. Total transacciones: ${transactions.length}`);
    console.log(`🔍 [ApplyFilters] Filtros aplicados:`, filters);

    let filtered = [...transactions];

    if (filters.minAmount !== undefined) {
      filtered = filtered.filter(tx => tx.amount >= filters.minAmount!);
    }

    if (filters.maxAmount !== undefined) {
      filtered = filtered.filter(tx => tx.amount <= filters.maxAmount!);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(tx => {
        const reference = tx.type === 'withdraw' && tx.payer_identification?.number
          ? tx.payer_identification.number
          : tx.type === 'deposit' && tx.external_reference
            ? tx.external_reference
            : '';

        return (tx.id.toString().toLowerCase().includes(searchLower)) ||
          (tx.payer_email && tx.payer_email.toLowerCase().includes(searchLower)) ||
          (tx.idCliente && tx.idCliente.toString().toLowerCase().includes(searchLower)) ||
          reference.toLowerCase().includes(searchLower);
      });
    }

    if (filters.reference) {
      const referenceLower = filters.reference.toLowerCase();
      filtered = filtered.filter(tx => {
        const reference = tx.type === 'withdraw' && tx.payer_identification?.number
          ? tx.payer_identification.number
          : tx.type === 'deposit' && tx.external_reference
            ? tx.external_reference
            : '';
        return reference.toLowerCase().includes(referenceLower);
      });
    }

    if (filters.dateFrom) {
      // Crear fecha específicamente en GMT-3 (UTC-3)
      const [year, month, day] = filters.dateFrom.split('-').map(Number);
      const fromDate = new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0)); // 03:00 UTC = 00:00 GMT-3
      console.log(`🔍 [DateFilter] Filtro desde: ${filters.dateFrom} -> ${fromDate.toISOString()} (GMT-3: ${fromDate.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })})`);
      const beforeDateFilter = filtered.length;
      filtered = filtered.filter(tx => {
        // Usar updated_at si está disponible, sino usar date_created
        const txDate = new Date(tx.updated_at || tx.date_created);
        const matches = txDate >= fromDate;
        if (!matches && filters.dateFrom) {
          console.log(`🔍 [DateFilter] Excluida por fecha desde - TX: ${tx.id}, fecha: ${txDate.toISOString()}`);
        }
        return matches;
      });
      console.log(`🔍 [DateFilter] Después de filtro desde: ${beforeDateFilter} → ${filtered.length}`);
    }

    if (filters.dateTo) {
      // Crear fecha específicamente en GMT-3 (UTC-3)
      const [year, month, day] = filters.dateTo.split('-').map(Number);
      const toDate = new Date(Date.UTC(year, month - 1, day + 1, 2, 59, 59, 999)); // 02:59:59 UTC del día siguiente = 23:59:59 GMT-3
      console.log(`🔍 [DateFilter] Filtro hasta: ${filters.dateTo} -> ${toDate.toISOString()} (GMT-3: ${toDate.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })})`);
      const beforeDateFilter = filtered.length;
      filtered = filtered.filter(tx => {
        // Usar updated_at si está disponible, sino usar date_created
        const txDate = new Date(tx.updated_at || tx.date_created);
        const matches = txDate <= toDate;
        if (!matches && filters.dateTo) {
          console.log(`🔍 [DateFilter] Excluida por fecha hasta - TX: ${tx.id}, fecha: ${txDate.toISOString()}`);
        }
        return matches;
      });
      console.log(`🔍 [DateFilter] Después de filtro hasta: ${beforeDateFilter} → ${filtered.length}`);
    }

    console.log(`🔍 [ApplyFilters] Filtrado completado. Total final: ${filtered.length}`);
    return filtered;
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
      // Para páginas "Completados", mostrar tanto aceptadas como rechazadas y Match MP
      // Sin incluir las transacciones "Bank Transfer" que ahora van en Depósitos Directos
      filtered = transactions.filter(tx =>
        tx.type === type &&
        (
          tx.status === 'Aceptado' ||
          tx.status === 'approved' ||
          tx.status === 'Rechazado' ||
          tx.status === 'Match MP'
          // Ya no incluimos (tx.status === 'Pending' && tx.description === 'Bank Transfer')
        )
      );
    } else if (type === 'deposit' && status === 'Pending') {
      // Para depósitos pendientes, filtrar por descripción específica
      filtered = transactions.filter(tx =>
        tx.type === type &&
        tx.status === status &&
        tx.description.startsWith('Depósito reportado por usuario, pendiente de validación')
      );
    } else if (type === 'deposit' && status === 'Match MP') {
      // Para depósitos con coincidencia MP
      filtered = transactions.filter(tx =>
        tx.type === type &&
        tx.status === 'Match MP'
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
      filtered = this.applyFilters(filtered, filters);
    }

    return filtered;
  }

  // Aprobar una transacción
  async approveTransaction(transaction: Transaction, accessToken: string): Promise<ApproveTransactionResult> {
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

      // Intentamos hacer la solicitud
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      // Debug explícito del status HTTP
      console.log(`[${opId}] Status HTTP de la respuesta: ${response.status}`);

      // Intentamos parsear la respuesta JSON
      let responseData;
      try {
        responseData = await response.json();
        console.log(`[${opId}] Respuesta JSON recibida:`, JSON.stringify(responseData));
      } catch (parseError) {
        console.error(`[${opId}] ERROR: No se pudo parsear la respuesta como JSON:`, parseError);
        return {
          success: false,
          error: `Error al procesar la respuesta: ${response.statusText || 'Status ' + response.status}`
        };
      }

      // Verificamos si la respuesta HTTP fue exitosa (códigos 2xx)
      if (!response.ok) {
        const errorMsg = responseData.message ||
          responseData.error ||
          `Error al confirmar la transacción: ${response.status}`;

        console.error(`[${opId}] ERROR: La transacción falló. Status: ${response.status}, Mensaje: ${errorMsg}`);

        // Resultado explícito de fallo
        const result: ApproveTransactionResult = {
          success: false,
          error: errorMsg
        };

        console.log(`[${opId}] Devolviendo resultado de ERROR:`, JSON.stringify(result));
        return result;
      }

      console.log(`[${opId}] FIN: Transacción aprobada, respuesta:`, JSON.stringify(responseData));

      // Resultado explícito de éxito
      const successResult: ApproveTransactionResult = {
        success: true,
        transaction: responseData.transaction
      };

      console.log(`[${opId}] Devolviendo resultado de ÉXITO:`, JSON.stringify(successResult));
      return successResult;
    } catch (error: unknown) {
      console.error(`[${opId}] ERROR: Error al aprobar transacción:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Error al procesar la transacción';

      // Resultado explícito de excepción
      const errorResult: ApproveTransactionResult = {
        success: false,
        error: errorMessage
      };

      console.log(`[${opId}] Devolviendo resultado de EXCEPCIÓN:`, JSON.stringify(errorResult));
      return errorResult;
    }
  }

  // Rechazar una transacción
  async rejectTransaction(transaction: Transaction, accessToken: string): Promise<Transaction> {
    try {
      // Llamar al endpoint de rechazo con el ID de la transacción
      const transactionType = transaction.type;
      const endpoint = `${this.apiUrl}/transactions/${transactionType}/${transaction.id}/reject`;

      console.log(`Rechazando transacción: ${transaction.id} - Endpoint: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      if (!response.ok) {
        throw new Error(`Error al rechazar la transacción: ${response.status}`);
      }

      // Obtener la transacción actualizada de la respuesta
      const responseData = await response.json();
      return responseData.transaction;
    } catch (error: unknown) {
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

  // Actualizar estado de transacción
  async updateTransactionStatus(transactionId: string | number, newStatus: string, accessToken: string): Promise<{ success: boolean; transaction?: Transaction; error?: string }> {
    const opId = `fe_update_status_${transactionId}_${Date.now()}`;
    console.log(`[${opId}] INICIO: Actualizando estado de transacción ${transactionId} a ${newStatus}`);

    try {
      if (!this.apiUrl) {
        throw new Error('API URL is not configured.');
      }

      const endpoint = `${this.apiUrl}/transactions/${transactionId}/status`;
      console.log(`[${opId}] Enviando solicitud a: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        let errorMsg = `Error al actualizar estado: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorData.error || errorMsg;
        } catch { }

        console.error(`[${opId}] ERROR: ${errorMsg}`);
        return {
          success: false,
          error: errorMsg
        };
      }

      const responseData = await response.json();
      console.log(`[${opId}] ÉXITO: Estado actualizado correctamente`);

      return {
        success: true,
        transaction: responseData.transaction
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar el estado';
      console.error(`[${opId}] EXCEPCIÓN: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage
      };
    }
  }
}

// Singleton para acceder al servicio desde cualquier componente
export const transactionService = new TransactionService();

export function useTransactionService() {
  const { data: session } = useSession();

  const fetchTransactions = async (officeId: string) => {
    if (!session?.accessToken) {
      throw new Error('No authentication token available');
    }
    return transactionService.getTransactionsForOffice(officeId, session.accessToken);
  };

  const approveTransaction = async (transaction: Transaction) => {
    if (!session?.accessToken) {
      throw new Error('No authentication token available');
    }
    return transactionService.approveTransaction(transaction, session.accessToken);
  };

  const rejectTransaction = async (transaction: Transaction) => {
    if (!session?.accessToken) {
      throw new Error('No authentication token available');
    }
    return transactionService.rejectTransaction(transaction, session.accessToken);
  };

  const updateTransactionStatus = async (transactionId: string | number, newStatus: string) => {
    if (!session?.accessToken) {
      throw new Error('No authentication token available');
    }
    return transactionService.updateTransactionStatus(transactionId, newStatus, session.accessToken);
  };

  return {
    fetchTransactions,
    approveTransaction,
    rejectTransaction,
    updateTransactionStatus,
    applyFilters: transactionService.applyFilters.bind(transactionService),
    filterTransactions: transactionService.filterTransactions.bind(transactionService)
  };
}