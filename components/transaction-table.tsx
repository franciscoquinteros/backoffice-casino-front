"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  ChevronRight,
  Check,
  X,
  UserIcon
} from "lucide-react";
import { Transaction } from "@/components/transaction-service";
import { SimpleErrorModal } from "@/components/error-modal";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TransactionTableProps {
  transactions: Transaction[];
  showApproveButton?: boolean;
  onTransactionApproved?: (updatedTransaction: Transaction) => void;
  onTransactionRejected?: (transaction: Transaction) => void;
  isRefreshing?: boolean;
  hideIdColumn?: boolean;
  isViewOnly?: boolean;
  onStatusToggle?: (transaction: Transaction) => void;
}

export function TransactionTable({
  transactions,
  showApproveButton = false,
  onTransactionApproved,
  onTransactionRejected,
  isRefreshing = false,
  hideIdColumn = false,
  isViewOnly = false,
  onStatusToggle,
}: TransactionTableProps) {
  const { data: session } = useSession();
  const [sortField, setSortField] = useState<keyof Transaction>('date_created');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [processingId, setProcessingId] = useState<string | number | null>(null);
  // Estados para paginación con persistencia en sessionStorage
  const [currentPage, setCurrentPage] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('transaction-table-current-page');
      return saved ? parseInt(saved, 10) : 1;
    }
    return 1;
  });
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('transaction-table-items-per-page');
      return saved ? parseInt(saved, 10) : 10;
    }
    return 10;
  });
  const [normalizedTransactions, setNormalizedTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accountNameCache, setAccountNameCache] = useState<Record<string, string>>({});
  const [loadingAccountNames, setLoadingAccountNames] = useState<Record<string, boolean>>({});
  const [failedAccountNameFetches, setFailedAccountNameFetches] = useState<Set<string | number>>(new Set());
  const [forceUpdate, setForceUpdate] = useState(0); // Para forzar re-renderizado interno

  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: '',
    message: ''
  });

  // Normalizar los datos de transacciones cuando cambian
  useEffect(() => {
    console.log(`🔄 [TransactionTable] Normalizando transacciones. Total recibidas: ${transactions.length}`);

    // Agregar logs detallados de las primeras transacciones para debuggear
    if (transactions.length > 0) {
      console.log(`🔄 [TransactionTable] Primeras 3 transacciones:`, transactions.slice(0, 3).map(tx => ({
        id: tx.id,
        status: tx.status,
        updated_at: tx.updated_at
      })));
    }

    const normalize = (transactions: Transaction[]): Transaction[] => {
      return transactions.map(tx => {
        // Log detallado de cada transacción para debuggear problemas de estado
        console.log(`🔄 [TransactionTable] Normalizando TX ${tx.id}: status="${tx.status}"`);

        // Crear una copia para no modificar el original
        const normalized = { ...tx };

        // IMPORTANTE: Conservar account_name si ya existe en los datos originales
        if (tx.account_name && tx.account_name !== 'No disponible') {
          normalized.account_name = tx.account_name;
        }

        // Si aún no tiene fecha, asignar una por defecto
        if (!normalized.date_created) {
          normalized.date_created = new Date().toISOString();
        }

        // Si no tiene tipo, asignar 'deposit' como valor por defecto
        if (!normalized.type) {
          normalized.type = 'deposit';
        }

        // Si no tiene estado, asignar 'Pending' como valor por defecto
        if (!normalized.status) {
          normalized.status = 'Pending';
        }

        // Caso especial para las transacciones "Bank Transfer" - asegurar que siempre tienen account_name
        if (normalized.description === 'Bank Transfer') {
          // Verificar múltiples fuentes posibles para el nombre de cuenta
          const originalAccountNameProp = (normalized as { accountName?: string }).accountName;

          // Verificar múltiples fuentes posibles para el nombre de cuenta
          if (!normalized.account_name) {
            // Si account_name está vacío, intentar obtenerlo de otras propiedades
            if (originalAccountNameProp) {
              // Primero intentar con la propiedad accountName (de la entidad TypeORM)
              normalized.account_name = originalAccountNameProp;
            } else if (normalized.account_holder) {
              // Luego intentar con account_holder
              normalized.account_name = normalized.account_holder;
            } else {
              // Si no hay ninguna fuente, usar un valor predeterminado
              normalized.account_name = 'Cuenta Bancaria Externa';
            }
          } else {
            // Si ya tiene account_name, mantenerlo
          }

          // Debug especial para ver qué valores estamos procesando
        } else {
          // Para transacciones no Bank Transfer (como IPN)
          if (!normalized.account_name) {
            // Si no tiene account_name, intentar obtenerlo de otras propiedades
            const normalizedWithAccountName = normalized as { accountName?: string };
            if (normalizedWithAccountName.accountName) {
              normalized.account_name = normalizedWithAccountName.accountName;
            } else if (normalized.account_holder) {
              normalized.account_name = normalized.account_holder;
            } else {
              normalized.account_name = 'No disponible';
            }
          }
        }

        console.log(`✅ [TransactionTable] TX ${tx.id} normalizada con status: "${normalized.status}"`);
        return normalized;
      });
    };

    const normalizedTxs = normalize(transactions);
    console.log(`✅ [TransactionTable] Normalizacion completada. Total: ${normalizedTxs.length}`);
    setNormalizedTransactions(normalizedTxs);

    // Forzar actualización interna cada vez que cambien las transacciones
    setForceUpdate(prev => prev + 1);
    console.log(`🔄 [TransactionTable] ForceUpdate incrementado por cambio de transacciones`);
  }, [transactions]); // Solo depende de transactions

  // useEffect adicional para detectar cambios específicos en normalizedTransactions
  useEffect(() => {
    if (normalizedTransactions.length > 0) {
      console.log(`🔄 [TransactionTable] normalizedTransactions cambiaron. ForceUpdate: ${forceUpdate}`);
      console.log(`🔄 [TransactionTable] Estados actuales:`, normalizedTransactions.slice(0, 3).map(tx => ({
        id: tx.id,
        status: tx.status
      })));
    }
  }, [normalizedTransactions, forceUpdate]);

  // Persistir currentPage en sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('transaction-table-current-page', currentPage.toString());
    }
  }, [currentPage]);

  // Persistir itemsPerPage en sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('transaction-table-items-per-page', itemsPerPage.toString());
    }
  }, [itemsPerPage]);



  // Función para cerrar el modal
  const closeErrorModal = () => {
    console.log("CERRANDO MODAL");
    setErrorModal({
      isOpen: false,
      title: '',
      message: ''
    });
  };

  // Ordenar transacciones usando useMemo para asegurar actualizaciones correctas
  const sortedTransactions = useMemo(() => {
    console.log(`🔄 [TransactionTable] Recalculando sortedTransactions. Total: ${normalizedTransactions.length}, ForceUpdate: ${forceUpdate}`);

    const sorted = [...normalizedTransactions].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (aValue === bValue) return 0;

      // Manejo para diferentes tipos de datos
      if (sortField === 'date_created') {
        // Usar updated_at si está disponible, sino usar date_created
        const aDate = new Date(a.updated_at || a.date_created || '');
        const bDate = new Date(b.updated_at || b.date_created || '');
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

    console.log(`✅ [TransactionTable] sortedTransactions calculadas. Primeras 3:`, sorted.slice(0, 3).map(tx => ({
      id: tx.id,
      status: tx.status
    })));

    return sorted;
  }, [normalizedTransactions, sortField, sortDirection, forceUpdate]);

  // Paginación usando useMemo para asegurar actualizaciones correctas
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedTransactions = sortedTransactions.slice(startIndex, endIndex);

    console.log(`🔄 [TransactionTable] Paginación recalculada. Página ${currentPage}, Total páginas: ${totalPages}, Transacciones en página: ${paginatedTransactions.length}`);

    return {
      totalPages,
      startIndex,
      endIndex,
      paginatedTransactions
    };
  }, [sortedTransactions, currentPage, itemsPerPage]);

  const { totalPages, startIndex, endIndex, paginatedTransactions } = paginationData;

  // Ajustar página actual si excede el número total de páginas después de cambios
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [sortedTransactions.length, itemsPerPage, currentPage, totalPages]);

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
  const handleExport = async () => {
    try {
      // Usamos setTimeout y Promise para evitar bloquear el hilo principal
      await new Promise(resolve => setTimeout(resolve, 0));

      // Crear encabezados para el CSV
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

      // Procesamiento por lotes para evitar bloqueos en grandes conjuntos de datos
      const batchSize = 100;
      let rows: Array<Array<string | number | undefined>> = [];

      // Procesar en pequeños lotes
      for (let i = 0; i < paginatedTransactions.length; i += batchSize) {
        const batch = paginatedTransactions.slice(i, i + batchSize);

        // Permitir que el navegador respire entre lotes
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }

        const batchRows = batch.map(transaction => {
          const reference = getTransactionReference(transaction);
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

        rows = [...rows, ...batchRows];
      }

      // Combinar encabezados y filas
      const csvContent = [
        headers.join(','),
        ...rows.map(row =>
          row.map((cell: string | number | undefined) =>
            `"${String(cell || '').replace(/"/g, '""')}"`
          ).join(',')
        )
      ].join('\n');

      // Otra pequeña pausa antes de crear el blob
      await new Promise(resolve => setTimeout(resolve, 0));

      // Crear un Blob y generar URL
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      // Crear enlace y descargar
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `transacciones_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();

      // Limpiar, pero con un pequeño retraso para asegurar que se complete la descarga
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

    } catch (error) {
      console.error("Error al exportar transacciones:", error);
      setErrorModal({
        isOpen: true,
        title: 'Error al exportar',
        message: 'Ocurrió un error al exportar los datos. Por favor, inténtelo de nuevo.'
      });
    }
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
    } catch {
      return 'Error de formato';
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
    // Para transacciones de tipo withdraw, devolver cadena vacía
    if (transaction.type === 'withdraw') {
      return '';
    }

    // Para otros tipos de transacciones, mantener la lógica existente
    return transaction.external_reference ||
      transaction.reference_id ||
      transaction.reference ||
      transaction.transaction_reference ||
      transaction.reference_transaction ||
      'N/A';
  };

  const getTransactionAccount = (transaction: Transaction): string => {
    // Log para depurar valores disponibles
    console.log(`getTransactionAccount para ID ${transaction.id}: `, {
      payer_email: transaction.payer_email,
      wallet_address: transaction.wallet_address,
      cbu: transaction.cbu,
      account_number: transaction.account_number,
      account: transaction.account
    });

    // Si es una transacción Bank Transfer, devolver cadena vacía
    if (transaction.description === 'Bank Transfer') {
      return ''; // Campo vacío para Bank Transfer
    }

    // Para cualquier tipo de transacción, incluidos retiros, mostrar la información de cuenta
    return transaction.payer_email ||
      transaction.wallet_address ||
      transaction.cbu ||
      transaction.account_number ||
      transaction.account ||
      'No disponible';
  };

  // Función para obtener la fecha de transacción
  const getTransactionDate = (transaction: Transaction): string => {
    // Usar un tipo de índice en lugar de 'any'
    type TransactionWithDates = Transaction & {
      createdAt?: string;
      created_at?: string;
      updatedAt?: string;
      updated_at?: string;
    };

    const txWithDates = transaction as TransactionWithDates;

    // Priorizar updated_at sobre date_created para mostrar la fecha más reciente
    const dateValue = transaction.updated_at ||
      txWithDates.updatedAt ||
      transaction.date_created ||
      txWithDates.createdAt ||
      txWithDates.created_at ||
      txWithDates.updated_at ||
      null;

    // Verificar si la fecha es válida antes de formatearla
    if (dateValue) {
      try {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return date.toLocaleString('es-AR');
        } else {
          return 'Fecha inválida';
        }
      } catch {
        return 'Error de formato';
      }
    }

    return 'No disponible';
  };

  // Función para obtener usuarios de la oficina
  const fetchOfficeUsers = useCallback(async () => {
    if (!session?.accessToken || !session?.user?.officeId) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('No se pudieron obtener los usuarios');
      }

      await response.json();
    } catch (fetchError) {
      console.error('Error al obtener usuarios:', fetchError);
      toast.error('No se pudieron cargar los usuarios');
    }
  }, [session?.accessToken, session?.user?.officeId]);

  // Cargar usuarios al iniciar
  useEffect(() => {
    fetchOfficeUsers();
  }, [fetchOfficeUsers]);

  const renderStatusBadge = (status: string, transaction: Transaction) => {
    // Debug para rastrear qué estado se está usando para renderizar
    console.log(`🏷️ [TransactionTable] Renderizando badge para TX ${transaction.id}: status="${status}" (transaction.status="${transaction.status}")`);

    if (!status) return (
      <Badge className="bg-gray-100 text-gray-800 flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        <span>Desconocido</span>
      </Badge>
    );

    let badgeContent;
    if (status === 'Pending') {
      badgeContent = (
        <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>Pendiente</span>
        </Badge>
      );
    } else if (status === 'Asignado') {
      badgeContent = (
        <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
          <UserIcon className="h-3 w-3" />
          <span>Asignado</span>
        </Badge>
      );
    } else if (status === 'Match MP') {
      badgeContent = (
        <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          <span>Match MP</span>
        </Badge>
      );
    } else if (status === 'Aceptado' || status === 'approved') {
      badgeContent = (
        <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
          <Check className="h-3 w-3" />
          <span>Aceptado</span>
        </Badge>
      );
    } else if (status === 'Rechazado' || status === 'rejected') {
      badgeContent = (
        <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
          <X className="h-3 w-3" />
          <span>Rechazado</span>
        </Badge>
      );
    } else {
      badgeContent = <Badge>{status}</Badge>;
    }

    // Si onStatusToggle está presente y el estado es Pending o Asignado, usar dropdown
    if (onStatusToggle && (status === 'Pending' || status === 'Asignado')) {
      const oppositeStatus = status === 'Pending' ? 'Asignado' : 'Pendiente';
      const oppositeIcon = status === 'Pending' ? <UserIcon className="h-3 w-3 mr-2" /> : <Clock className="h-3 w-3 mr-2" />;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="cursor-pointer hover:opacity-80 transition-opacity">
              {badgeContent}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => onStatusToggle(transaction)}
              className="cursor-pointer"
            >
              {oppositeIcon}
              Cambiar a {oppositeStatus}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return badgeContent;
  };

  // Función para obtener el nombre de cuenta directamente desde el backend
  const fetchAccountNameFromBackend = useCallback(async (transactionId: string | number) => {
    // Si ya hemos intentado y fallado antes, no volver a intentar
    if (failedAccountNameFetches.has(transactionId)) {
      return null;
    }

    if (!session?.accessToken) return null;

    try {
      setLoadingAccountNames(prev => ({ ...prev, [transactionId]: true }));

      // Solo intentar obtener detalles para transacciones Bank Transfer para evitar 404
      const transaction = normalizedTransactions.find(tx => tx.id === transactionId);
      if (!transaction || transaction.description !== 'Bank Transfer') {
        // Marcar como fallido si no es Bank Transfer para evitar nuevos intentos
        setFailedAccountNameFetches(prev => new Set([...prev, transactionId]));
        return null;
      }

      // Consultar el endpoint para obtener detalles de la transacción
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/transactions/details/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 404) {
        // Error 404: La transacción no existe o el endpoint no está disponible
        setFailedAccountNameFetches(prev => new Set([...prev, transactionId]));
        return null;
      }

      if (!response.ok) {
        // Otros errores (500, 401, etc.) - Puede ser temporal, no marcar como fallido permanentemente
        return null;
      }

      // Intentar procesar la respuesta JSON
      try {
        const data = await response.json();

        // Verificar todas las posibles ubicaciones donde puede estar el account_name
        let accountName = null;
        if (data) {
          // Prioridad 1: campo account_name directo
          if (data.account_name && data.account_name !== 'No disponible') {
            accountName = data.account_name;
          }
          // Prioridad 2: dentro del objeto transaction
          else if (data.transaction && data.transaction.account_name && data.transaction.account_name !== 'No disponible') {
            accountName = data.transaction.account_name;
          }
          // Prioridad 3: usar account_holder
          else if (data.account_holder && data.account_holder !== 'No disponible') {
            accountName = data.account_holder;
          }
          // Prioridad 4: usar accountName (camelCase)
          else if (data.accountName && data.accountName !== 'No disponible') {
            accountName = data.accountName;
          }
          // Prioridad 5: verificar si está en la columna "accountName" directamente
          else if (data.transaction && data.transaction.accountName && data.transaction.accountName !== 'No disponible') {
            accountName = data.transaction.accountName;
          }
        }

        if (accountName) {
          // Guardar en caché
          setAccountNameCache(prev => ({
            ...prev,
            [transactionId]: accountName
          }));

          // Actualizar también en normalizedTransactions para mostrar de inmediato
          setNormalizedTransactions(prev =>
            prev.map(tx =>
              tx.id === transactionId
                ? { ...tx, account_name: accountName }
                : tx
            )
          );

          return accountName;
        }

        // Marcar como fallido si no se encontró un nombre válido
        setFailedAccountNameFetches(prev => new Set([...prev, transactionId]));
        return null;
      } catch (jsonError) {
        console.error('Error al procesar JSON de detalles:', jsonError);
        // Error al procesar JSON - respuesta inválida
        setFailedAccountNameFetches(prev => new Set([...prev, transactionId]));
        return null;
      }
    } catch {
      // Error de red o de otro tipo - podría ser temporal
      // No marcamos como fallido permanentemente para poder reintentar
      return null;
    } finally {
      setLoadingAccountNames(prev => ({ ...prev, [transactionId]: false }));
    }
  }, [session?.accessToken, failedAccountNameFetches, normalizedTransactions, setNormalizedTransactions]);

  // useEffect para cargar nombres para transacciones Bank Transfer
  useEffect(() => {
    if (normalizedTransactions.length === 0) return;

    // Filtrar transacciones tipo "Bank Transfer"
    const bankTransfers = normalizedTransactions.filter(tx => tx.description === 'Bank Transfer');

    // Limitar peticiones a 5 a la vez para evitar sobrecarga
    const transactionsToProcess = bankTransfers.slice(0, 5);

    // Procesar solo transacciones que necesitan nombre
    for (const tx of transactionsToProcess) {
      // Evitar peticiones duplicadas
      if (accountNameCache[tx.id] ||
        loadingAccountNames[tx.id] ||
        failedAccountNameFetches.has(tx.id) ||
        (tx.account_name && tx.account_name !== 'No disponible')) {
        continue;
      }

      // Cargar los datos del backend
      fetchAccountNameFromBackend(tx.id);
    }

    // Procesar el siguiente lote después de 5 segundos
    if (bankTransfers.length > 5) {
      const timer = setTimeout(() => {
        setNormalizedTransactions([...normalizedTransactions]);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [normalizedTransactions, accountNameCache, loadingAccountNames, failedAccountNameFetches, fetchAccountNameFromBackend]);

  const getAccountNameDisplay = useCallback((transaction: Transaction) => {
    // Para retiros, mostrar el número de identificación del pagador
    if (transaction.type === 'withdraw' && transaction.payer_identification) {
      if (typeof transaction.payer_identification === 'string') {
        try {
          const parsed = JSON.parse(transaction.payer_identification);
          return parsed.number || '';
        } catch {
          return transaction.payer_identification;
        }
      }
      return transaction.payer_identification.number || '';
    }

    // Si ya tiene un account_name, usarlo directamente
    if (transaction.account_name &&
      transaction.account_name !== 'No disponible') {
      return transaction.account_name;
    }

    // Para Bank Transfer, usar el caché o el account_holder
    if (transaction.description === 'Bank Transfer') {
      if (accountNameCache[transaction.id]) {
        return accountNameCache[transaction.id];
      }
    }

    return transaction.account_holder || 'No disponible';
  }, [accountNameCache]);

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
                  Última Actualización
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>CBU/Cuenta</TableHead>
              <TableHead>Nombre Cuenta</TableHead>
              {showApproveButton && !isViewOnly && <TableHead>Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTransactions.map((transaction) => {
              // CRÍTICO: Buscar la transacción más actualizada de normalizedTransactions
              const updatedTransaction = normalizedTransactions.find(tx => tx.id === transaction.id) || transaction;

              // Debug crítico para ver qué estados estamos comparando
              console.log(`🎨 [TransactionTable] Renderizando fila para TX ${transaction.id}:`);
              console.log(`    - Estado original: "${transaction.status}"`);
              console.log(`    - Estado actualizado: "${updatedTransaction.status}"`);
              console.log(`    - ¿Son diferentes?: ${transaction.status !== updatedTransaction.status}`);

              // Crear una key más específica pero estable que incluya status y timestamp
              const specificKey = `${updatedTransaction.id}-${updatedTransaction.status}-${updatedTransaction.updated_at || updatedTransaction.date_created}`;

              return (
                <TableRow key={specificKey} className="hover:bg-muted/50">
                  {!hideIdColumn && (
                    <TableCell className="font-medium w-[80px] whitespace-pre-line">
                      {formatId(updatedTransaction.id)}
                    </TableCell>
                  )}
                  <TableCell>
                    {updatedTransaction.idCliente || updatedTransaction.client_id ||
                      (updatedTransaction.office ? `Oficina: ${updatedTransaction.office}` : 'No disponible')}
                  </TableCell>
                  <TableCell>
                    {getTransactionReference(updatedTransaction)}
                  </TableCell>
                  <TableCell>{updatedTransaction.description || 'Sin descripción'}</TableCell>
                  <TableCell className="font-medium">
                    {formatAmount(updatedTransaction.amount)}
                  </TableCell>
                  <TableCell>
                    {/* CRÍTICO: Usar updatedTransaction.status para asegurar el estado más reciente */}
                    {renderStatusBadge(updatedTransaction.status, updatedTransaction)}
                  </TableCell>
                  <TableCell>
                    {getTransactionDate(updatedTransaction)}
                  </TableCell>
                  <TableCell>
                    {updatedTransaction.description === 'Bank Transfer' ?
                      '' // Mostrar guión para Bank Transfer
                      :
                      updatedTransaction.payer_email ?
                        // Si hay payer_email, mostrarlo directamente con prioridad
                        updatedTransaction.payer_email
                        :
                        // Si no hay payer_email, usar la función getTransactionAccount
                        getTransactionAccount(updatedTransaction)
                    }
                  </TableCell>
                  <TableCell>
                    {getAccountNameDisplay(updatedTransaction)}
                  </TableCell>
                  {showApproveButton && !isViewOnly && (
                    <TableCell>
                      {updatedTransaction.status === 'Pending' ? (
                        <div className="flex space-x-2">
                          <Button
                            onClick={(e) => { e.stopPropagation(); handleApprove(updatedTransaction); }}
                            disabled={processingId === updatedTransaction.id || isRefreshing}
                            size="sm"
                            className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 text-xs"
                          >
                            {processingId === updatedTransaction.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                            <span className={processingId === updatedTransaction.id ? "ml-1" : "ml-1"}>Aceptar</span>
                          </Button>
                          <Button
                            onClick={(e) => { e.stopPropagation(); handleReject(updatedTransaction); }}
                            disabled={processingId === updatedTransaction.id || isRefreshing}
                            size="sm"
                            variant="destructive"
                            className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 text-xs"
                          >
                            {processingId === updatedTransaction.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                            <span className={processingId === updatedTransaction.id ? "ml-1" : "ml-1"}>Rechazar</span>
                          </Button>
                        </div>
                      ) : (
                        renderStatusBadge(updatedTransaction.status, updatedTransaction)
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
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

      {/* Modal para ver detalles de la transacción */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalles de la transacción</DialogTitle>
          </DialogHeader>
          {/* ... existing modal content ... */}
        </DialogContent>
      </Dialog>
    </>
  );
}
