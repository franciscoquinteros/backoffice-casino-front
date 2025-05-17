"use client";

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowUpDown,
  CheckCircle,
  Download,
  Clock,
  XCircle,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Transaction } from "@/components/transaction-service";
import { SimpleErrorModal } from "@/components/error-modal";

interface TransactionTableProps {
  transactions: Transaction[];
  showApproveButton?: boolean;
  onTransactionApproved?: (updatedTransaction: Transaction) => void;
  onTransactionRejected?: (transaction: Transaction) => void;
  isRefreshing?: boolean;
  hideIdColumn?: boolean;
}

export function TransactionTable({
  transactions,
  showApproveButton = false,
  onTransactionApproved,
  onTransactionRejected,
  isRefreshing = false,
  hideIdColumn = false
}: TransactionTableProps) {
  const [sortField, setSortField] = useState<keyof Transaction>('date_created');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [processingId, setProcessingId] = useState<string | number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [normalizedTransactions, setNormalizedTransactions] = useState<Transaction[]>([]);

  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: '',
    message: ''
  });

  // Normalizar los datos de transacciones cuando cambian
  useEffect(() => {
    console.log("Datos recibidos del backend:", transactions);
    // Esta función normaliza los datos para manejar cambios en la estructura del backend
    const normalize = (transactions: Transaction[]): Transaction[] => {
      return transactions.map(tx => {
        // Copia la transacción original
        const normalized = { ...tx };

        // Asegúrate de que los campos críticos existan
        if (normalized.idCliente === undefined && normalized.client_id !== undefined) {
          normalized.idCliente = normalized.client_id;
        }

        // Agregar ID de oficina como posible ID de cliente si no hay otro
        if (normalized.idCliente === undefined && normalized.client_id === undefined && normalized.office) {
          normalized.idCliente = normalized.office;
        }

        // Si el campo date_created viene en un formato distinto, normalizarlo
        if (typeof normalized.date_created === 'object' && normalized.date_created !== null) {
          normalized.date_created = new Date(normalized.date_created).toISOString();
        }

        // Ya no necesitamos normalizar external_reference aquí porque
        // ahora solo usamos ese campo exacto

        // Normalizar la información de la cuenta
        if (!normalized.account_name && normalized.account_holder) {
          normalized.account_name = normalized.account_holder;
        }

        return normalized;
      });
    };

    setNormalizedTransactions(normalize(transactions));
  }, [transactions]);

  // Función para cerrar el modal
  const closeErrorModal = () => {
    console.log("CERRANDO MODAL");
    setErrorModal({
      isOpen: false,
      title: '',
      message: ''
    });
  };

  // Ordenar transacciones
  const sortedTransactions = [...normalizedTransactions].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (aValue === bValue) return 0;

    // Manejo para diferentes tipos de datos
    if (sortField === 'date_created') {
      const aDate = new Date(a.date_created || '');
      const bDate = new Date(b.date_created || '');
      return sortDirection === 'asc'
        ? aDate.getTime() - bDate.getTime()
        : bDate.getTime() - aDate.getTime();
    }

    // Para valores numéricos
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }

    // Para strings
    const aString = String(aValue || '').toLowerCase();
    const bString = String(bValue || '').toLowerCase();
    return sortDirection === 'asc'
      ? aString.localeCompare(bString)
      : bString.localeCompare(aString);
  });

  // Paginación
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = sortedTransactions.slice(startIndex, endIndex);

  // Cambia el campo de ordenamiento o la dirección
  const handleSort = (field: keyof Transaction) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Maneja la aprobación de una transacción
  const handleApprove = (transaction: Transaction) => {
    if (processingId === transaction.id) return; // Evita doble click

    // Llama a la función del padre si existe
    if (onTransactionApproved) {
      setProcessingId(transaction.id); // Marca como procesando (visualmente)
      console.log("Notificando al padre para aprobar:", transaction.id);
      try {
        onTransactionApproved(transaction); // <-- Llama a la PROP del padre
        // El padre se encargará de llamar al servicio, mostrar toasts,
        // y eventualmente recargar la lista (lo que limpiará processingId vía useEffect)
      } catch (error) {
        // Si el handler del padre lanza un error síncrono (poco común)
        console.error("Error calling onTransactionApproved:", error);
        setProcessingId(null); // Limpia estado local si falla la llamada al handler
      }
      // Quitamos el finally de aquí, el estado se limpia por useEffect o en el padre
    } else {
      console.warn("onTransactionApproved prop is missing from TransactionTable");
    }
  };

  // Maneja el rechazo de una transacción
  const handleReject = (transaction: Transaction) => {
    if (processingId === transaction.id) return;

    if (onTransactionRejected) {
      setProcessingId(transaction.id); // Marca como procesando
      console.log("Notificando al padre para rechazar:", transaction.id);
      try {
        onTransactionRejected(transaction); // <-- Llama a la PROP del padre
      } catch (error) {
        console.error("Error calling onTransactionRejected:", error);
        setProcessingId(null);
      }
    } else {
      console.warn("onTransactionRejected prop is missing from TransactionTable");
    }
  };

  // Función para exportar transacciones a CSV
  const handleExport = () => {
    // Crear encabezados para el CSV (ajustar según las columnas de tu tabla)
    const headers = [
      'ID',
      'Cliente',
      'Referencia',
      'Descripción',
      'Monto',
      'Estado',
      'Fecha',
      'CBU/Cuenta',
      'Nombre Cuenta'
    ];

    // Crear filas de datos
    const rows = sortedTransactions.map(transaction => {
      // Usar la función getTransactionReference para la columna Referencia
      const reference = getTransactionReference(transaction);

      // Obtener información de cuenta de manera flexible
      const account = getTransactionAccount(transaction);

      return [
        transaction.id,
        transaction.idCliente || transaction.client_id || '',
        reference,
        transaction.description || '',
        transaction.amount,
        transaction.status,
        transaction.date_created ? formatDate(transaction.date_created) : 'No disponible',
        account,
        transaction.account_name || transaction.account_holder || ''
      ];
    });

    // Combinar encabezados y filas
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Crear un Blob y generar URL
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // Crear enlace y descargar
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transacciones_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();

    // Limpiar
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Formateadores de datos
  const formatDate = (dateString?: string) => {
    if (!dateString) {
      console.log('formatDate: dateString es null o undefined');
      return 'No disponible';
    }
    try {
      const date = new Date(dateString);
      // Verificar si la fecha es válida
      if (isNaN(date.getTime())) {
        console.log('formatDate: Fecha inválida:', dateString);
        return 'No disponible';
      }
      return date.toLocaleString('es-AR');
    } catch (e) {
      console.error("Error formateando fecha:", e, "Valor recibido:", dateString);
      return 'No disponible';
    }
  };

  const formatAmount = (amount: number) => {
    if (amount === undefined || amount === null) return '$0.00';
    try {
      return `$${amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } catch (e) {
      console.error("Error formateando monto:", e);
      return '$0.00';
    }
  };

  const formatId = (id: string | number) => {
    if (!id) return 'No disponible';

    const idString = id.toString();
    if (idString.length <= 8) return idString;

    // Dividir el ID en grupos de 8 dígitos
    const chunks = [];
    for (let i = 0; i < idString.length; i += 8) {
      chunks.push(idString.slice(i, i + 8));
    }
    return chunks.join('\n');
  };

  // Funciones para obtener datos de manera flexible
  const getTransactionReference = (transaction: Transaction): string => {
    // Intentar múltiples posibles campos donde podría estar la referencia
    return transaction.external_reference ||
      transaction.reference_id ||
      transaction.reference ||
      transaction.transaction_reference ||
      transaction.reference_transaction ||
      'No disponible';
  };

  const getTransactionAccount = (transaction: Transaction): string => {
    // Intentar múltiples posibles campos donde puede estar la información de cuenta
    return transaction.payer_email ||
      transaction.wallet_address ||
      transaction.cbu ||
      transaction.account_number ||
      transaction.account ||
      'No disponible';
  };

  // Función para obtener la fecha de transacción
  const getTransactionDate = (transaction: Transaction): string => {
    // Usar solo el campo date_created que sabemos que existe en el tipo Transaction
    // Accedemos a cualquier otro campo usando notación de índice para evitar errores de tipo
    const dateValue = transaction.date_created ||
      (transaction as any)['createdAt'] ||
      (transaction as any)['created_at'] ||
      (transaction as any)['updatedAt'] ||
      (transaction as any)['updated_at'] ||
      null;

    console.log('getTransactionDate para transacción ID:', transaction.id, 'Fecha encontrada:', dateValue);

    // Verificar si la fecha es válida antes de formatearla
    if (dateValue) {
      try {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return date.toLocaleString('es-AR');
        } else {
          console.log('Fecha inválida para transacción ID:', transaction.id, 'Valor:', dateValue);
          return 'Fecha inválida';
        }
      } catch (e) {
        console.error('Error al procesar fecha para transacción ID:', transaction.id, 'Error:', e);
        return 'Error de formato';
      }
    }

    return 'No disponible';
  };

  // Renderizar el badge de estado apropiado
  const renderStatusBadge = (status: string) => {
    if (!status) return (
      <Badge className="bg-gray-100 text-gray-800 flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        <span>Desconocido</span>
      </Badge>
    );

    if (status === 'Pending') {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>Pendiente</span>
        </Badge>
      );
    } else if (status === 'Aceptado' || status === 'approved') {
      return (
        <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          <span>Aceptado</span>
        </Badge>
      );
    } else if (status === 'Rechazado') {
      return (
        <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          <span>Rechazado</span>
        </Badge>
      );
    } else if (status === 'Error') {
      return (
        <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          <span>Error</span>
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-gray-100 text-gray-800 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          <span>{status}</span>
        </Badge>
      );
    }
  };

  // Renderizado condicional para tabla vacía
  if (transactions.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          No hay transacciones que coincidan con los filtros seleccionados
        </p>
      </Card>
    );
  }

  return (
    <>
      <Card className={isRefreshing ? "opacity-70 transition-opacity" : ""}>
        <div className="flex justify-between p-4">
          {isRefreshing && (
            <div className="flex items-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2"></div>
              <span className="text-sm text-muted-foreground">Actualizando...</span>
            </div>
          )}
          <div className={isRefreshing ? "ml-auto" : "w-full flex justify-end"}>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={handleExport}
              disabled={isRefreshing}
            >
              <Download className="h-4 w-4" />
              <span>Exportar</span>
            </Button>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              {!hideIdColumn && (
                <TableHead
                  className="cursor-pointer w-[80px]"
                  onClick={() => handleSort('id')}
                >
                  <div className="flex items-center">
                    ID
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </TableHead>
              )}
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort('idCliente')}
              >
                <div className="flex items-center">
                  Cliente
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center">
                  Monto
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>Estado</TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort('date_created')}
              >
                <div className="flex items-center">
                  Fecha
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>CBU/Cuenta</TableHead>
              <TableHead>Nombre Cuenta</TableHead>
              {showApproveButton && <TableHead>Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTransactions.map((transaction, index) => (
              <TableRow key={`${transaction.id}-${index}`} className="hover:bg-muted/50">
                {!hideIdColumn && (
                  <TableCell className="font-medium w-[80px] whitespace-pre-line">
                    {formatId(transaction.id)}
                  </TableCell>
                )}
                <TableCell>
                  {transaction.idCliente || transaction.client_id ||
                    (transaction.office ? `Oficina: ${transaction.office}` : 'No disponible')}
                </TableCell>
                <TableCell>
                  {getTransactionReference(transaction)}
                </TableCell>
                <TableCell>{transaction.description || 'Sin descripción'}</TableCell>
                <TableCell className="font-medium">
                  {formatAmount(transaction.amount)}
                </TableCell>
                <TableCell>
                  {renderStatusBadge(transaction.status)}
                </TableCell>
                <TableCell>
                  {getTransactionDate(transaction)}
                </TableCell>
                <TableCell>
                  {getTransactionAccount(transaction)}
                </TableCell>
                <TableCell>
                  {transaction.account_name || transaction.account_holder || 'No disponible'}
                </TableCell>
                {showApproveButton && (
                  <TableCell>
                    {transaction.status === 'Pending' ? (
                      <div className="flex space-x-2">
                        <Button
                          onClick={(e) => { e.stopPropagation(); handleApprove(transaction); }}
                          disabled={processingId === transaction.id || isRefreshing}
                          size="sm"
                          className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 text-xs"
                        >
                          {processingId === transaction.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                          <span className={processingId === transaction.id ? "ml-1" : "ml-1"}>Aceptar</span>
                        </Button>
                        <Button
                          onClick={(e) => { e.stopPropagation(); handleReject(transaction); }}
                          disabled={processingId === transaction.id || isRefreshing}
                          size="sm"
                          variant="destructive"
                          className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 text-xs"
                        >
                          {processingId === transaction.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                          <span className={processingId === transaction.id ? "ml-1" : "ml-1"}>Rechazar</span>
                        </Button>
                      </div>
                    ) : (
                      renderStatusBadge(transaction.status)
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Mostrando <span className="font-medium">{startIndex + 1}</span> a <span className="font-medium">
                {Math.min(endIndex, sortedTransactions.length)}
              </span> de <span className="font-medium">{sortedTransactions.length}</span> resultados
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm">
                Página {currentPage} de {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <select
                className="h-8 rounded border border-input bg-background px-3 text-sm"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1); // Resetea a página 1 cuando cambia items por página
                }}
              >
                {[10, 25, 50, 100].map(value => (
                  <option key={value} value={value}>
                    {value} / página
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </Card>

      <SimpleErrorModal
        isOpen={errorModal.isOpen}
        title={errorModal.title}
        message={errorModal.message}
        onClose={closeErrorModal}
      />
    </>
  );
}