'use client'

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession } from "next-auth/react"; // Importa useSession
import { TransferAccount } from '@/types/transfer-account'; // Ajusta ruta si es necesario
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TransferAccountsTable } from '@/components/transfer-accounts/transfer-accounts-table'; // Ajusta ruta
import { CreateTransferAccountModal } from '@/components/transfer-accounts/create-transfer-account-modal'; // Ajusta ruta
import { EditTransferAccountModal } from '@/components/transfer-accounts/edit-transfer-account-modal'; // Ajusta ruta
import { DeleteTransferAccountModal } from '@/components/transfer-accounts/delete-transfer-account-modal'; // Ajusta ruta
import { SkeletonLoader } from '@/components/skeleton-loader'; // Ajusta ruta
import { Skeleton } from '@/components/ui/skeleton'; // Ajusta ruta
import { TableSkeleton, type ColumnConfig } from '@/components/ui/table-skeleton'; // Ajusta ruta
import { Card } from '../ui/card';
import { useOffices } from "@/components/hooks/use-offices"; // Ajusta ruta

// Interfaces AccountData y AccountResponse
interface AccountData {
  name: string;
  office: string; // ¿O es 'agent'? Asegúrate que coincida con el backend y entidad User
  cbu: string;
  alias: string;
  wallet: 'mercadopago' | 'paypal';
  operator: string;
  agent: string; // ¿Este es el ID/Nombre del agente o la oficina? Revisa tu API y entidad User
  status: string;
  mp_client_id?: string;
  mp_client_secret?: string;
  mp_public_key?: string;
  mp_access_token?: string;
}

interface AccountResponse {
  id: number;
  name: string;
  office?: string;
  agent: string;
  cbu: string;
  alias: string;
  wallet: 'mercadopago' | 'paypal';
  operator: string;
  created_at: string;
  status: string;
  mp_client_id?: string;
  mp_client_secret?: string;
  mp_public_key?: string;
  mp_access_token?: string;
  receiver_id?: string;
}
// Fin Interfaces

export function TransferAccountsContent() {
  const { data: session, status: sessionStatus } = useSession();

  const [accounts, setAccounts] = useState<TransferAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingAccount, setEditingAccount] = useState<TransferAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<TransferAccount | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    offices: officeList, // Renombrado para claridad, asume que devuelve {id, name}[]
    isLoading: isLoadingOffices } = useOffices();

  const officeMap = useMemo(() => {
    const map = new Map<string, string>();
    if (officeList && Array.isArray(officeList)) {
      officeList.forEach(office => {
        map.set(office.id.toString(), office.name); // Clave es ID (string), Valor es Nombre
      });
    }
    return map;
  }, [officeList]);

  const getOfficeName = useCallback((officeId: string | number | undefined | null): string => {
    if (officeId === null || officeId === undefined) return 'N/A';
    return officeMap.get(officeId.toString()) || `ID: ${officeId}`; // Devuelve nombre o ID si no se encuentra
  }, [officeMap]);

  const fetchAccounts = useCallback(async (showLoadingState = false) => {
    // Verifica sesión antes de llamar
    if (sessionStatus !== "authenticated" || !session?.user?.officeId || !session?.accessToken) { // <-- Añadida verificación de officeId aquí también
      console.log("Fetch Accounts prevented: Session not ready or missing data.", { sessionStatus, officeId: session?.user?.officeId, hasToken: !!session?.accessToken });
      if (sessionStatus === "authenticated") {
        setError("Datos de sesión incompletos (falta oficina o token).");
        toast.error("Datos de sesión incompletos. Intenta re-loguearte.");
      }
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }
    // Extrae los datos necesarios
    const accessToken = session.accessToken;
    const officeId = session.user.officeId; // <-- Obtiene el officeId de la sesión

    if (showLoadingState) setIsRefreshing(true);
    else if (accounts.length === 0) setIsLoading(true);
    setError(null);

    try {
      // --- CONSTRUCCIÓN DE LA URL CORREGIDA ---
      // Añade el officeId como query parameter
      const endpoint = `${process.env.NEXT_PUBLIC_BACKEND_URL}/accounts?officeId=${encodeURIComponent(officeId)}`;
      // --- FIN URL CORREGIDA ---

      console.log(`Workspaceing accounts from backend: ${endpoint}`); // Loguea la URL completa

      const response = await fetch(endpoint, { // Llama a la URL con el query param
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${accessToken}`, // Envía el token
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        let errorMsg = 'Error al obtener las cuentas';
        try {
          const errorData = await response.json();
          // Captura el mensaje específico del backend si está disponible
          errorMsg = errorData.message || errorData.error || errorMsg;
          // Si el error es específicamente por el query param (aunque no debería pasar ahora)
          if (response.status === 400 && errorMsg.toLowerCase().includes('officeid query parameter is required')) {
            errorMsg = "Error: El backend requiere el ID de oficina en la URL.";
          }
        } catch { }
        console.error(`Error fetching accounts (${response.status}): ${errorMsg}`);
        throw new Error(errorMsg);
      }

      const data = await response.json();
      if (!data || !Array.isArray(data.accounts)) {
        throw new Error("Formato de respuesta inesperado del servidor.");
      }

      // Debug log para ver la respuesta del backend
      console.log('Response from backend:', data.accounts);

      // Mapeo de la respuesta del backend
      const transformedAccounts: TransferAccount[] = data.accounts.map((account: AccountResponse) => {
        // Debug log para cada cuenta
        console.log('Processing account:', account);

        return {
          id: account.id.toString(),
          userName: account.name,
          office: account.office || '', // Usar account.office en lugar de account.agent
          officeId: account.office || '', // Asegurar que officeId tenga el mismo valor que office
          cbu: account.cbu,
          alias: account.alias,
          wallet: account.wallet,
          operator: account.operator,
          agent: account.agent,
          createdAt: new Date(account.created_at),
          isActive: account.status === 'active',
          mp_client_id: account.mp_client_id || '',
          mp_client_secret: account.mp_client_secret || '',
          mp_public_key: account.mp_public_key || '',
          mp_access_token: account.mp_access_token || '',
          receiver_id: account.receiver_id || '',
        };
      });

      setAccounts(transformedAccounts);
      console.log("Accounts fetched successfully:", transformedAccounts.length);

    } catch (error: unknown) {
      console.error('Error fetching accounts:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
    // Añade officeId y accessToken (o session directamente) a las dependencias si la lógica depende de ellos explícitamente
  }, [session, sessionStatus, accounts.length]);


  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchAccounts(false);
    } else if (sessionStatus === "unauthenticated") {
      setIsLoading(false);
      setError("Necesitas iniciar sesión para ver las cuentas.");
    }
  }, [sessionStatus, fetchAccounts]);


  // --- handleEdit CON CORRECCIÓN ---
  const handleEdit = async (updatedAccount: TransferAccount) => {
    if (sessionStatus !== "authenticated" || !session?.accessToken) {
      toast.error("Autenticación requerida para editar.");
      return;
    }
    const accessToken = session.accessToken;

    try {
      // Usa Partial porque quizás no todos los campos de AccountData se envían siempre
      const accountData: Partial<AccountData> = {
        name: updatedAccount.userName,
        cbu: updatedAccount.cbu,
        alias: updatedAccount.alias,
        wallet: updatedAccount.wallet,
        operator: updatedAccount.operator,
        status: updatedAccount.isActive ? 'active' : 'inactive',
        office: updatedAccount.office, // Añadir el campo office
        // Incluir campos MP solo si tienen valor
        mp_client_id: updatedAccount.mp_client_id || undefined,
        mp_client_secret: updatedAccount.mp_client_secret || undefined,
        mp_public_key: updatedAccount.mp_public_key || undefined,
        mp_access_token: updatedAccount.mp_access_token || undefined,
      };

      // Limpia las propiedades que son 'undefined' antes de enviar
      Object.keys(accountData).forEach(key => {
        const k = key as keyof AccountData;
        if (accountData[k] === undefined) {
          delete accountData[k];
        }
      });

      console.log(`Updating account ${updatedAccount.id} with data:`, accountData);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/accounts/${updatedAccount.id}?officeId=${encodeURIComponent(updatedAccount.office)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(accountData),
        }
      );

      if (!response.ok) {
        let errorMsg = 'Error al actualizar la cuenta';
        try { const errorData = await response.json(); errorMsg = errorData.message || errorMsg; } catch { }
        throw new Error(errorMsg);
      }

      await fetchAccounts(true);
      toast.success('Cuenta actualizada correctamente');
      setEditingAccount(null);
    } catch (error: unknown) {
      console.error('Error updating account:', error);
      toast.error((error as Error).message || 'Error al actualizar la cuenta');
    }
  };
  // --- Fin handleEdit ---


  const handleDelete = async () => {
    if (!deletingAccount) return;
    if (sessionStatus !== "authenticated" || !session?.accessToken) {
      toast.error("Autenticación requerida para eliminar.");
      return;
    }
    const accessToken = session.accessToken;
    const accountIdToDelete = deletingAccount.id;

    // Obtener el ID de la oficina (puedes obtenerlo del session o del deletingAccount)
    const officeId = session.user.officeId; // O podrías usar deletingAccount.office si contiene el ID de oficina

    try {
      console.log(`Deleting account ${accountIdToDelete}`);

      // Construir la URL incluyendo officeId como parámetro de consulta
      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/accounts/${accountIdToDelete}?officeId=${encodeURIComponent(officeId)}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        let errorMsg = 'Error al eliminar la cuenta';
        try { const errorData = await response.json(); errorMsg = errorData.message || errorMsg; } catch { }
        throw new Error(errorMsg);
      }

      await fetchAccounts(true);
      toast.success('Cuenta eliminada correctamente');
      // setDeletingAccount(null); // Ya se hace en finally
    } catch (error: unknown) {
      console.error('Error deleting account:', error);
      toast.error((error as Error).message || 'Error al eliminar la cuenta');
    } finally {
      // Asegura limpiar el estado incluso si la recarga falla
      setDeletingAccount(null);
    }
  };


  // Skeleton de la tabla de cuentas (sin cambios)
  const tableColumns: ColumnConfig[] = [
    { cell: { type: 'text' } }, // Nombre
    { cell: { type: 'text', widthClass: 'w-1/2' } }, // Oficina
    { cell: { type: 'text', widthClass: 'w-4/5' } }, // CBU
    { cell: { type: 'text', widthClass: 'w-4/5' } }, // Alias
    { cell: { type: 'badge', widthClass: 'w-28' } }, // Billetera
    { cell: { type: 'text', widthClass: 'w-3/4' } }, // Operador
    { cell: { type: 'text', widthClass: 'w-2/3' } }, // Agente
    { cell: { type: 'badge', widthClass: 'w-20' } }, // Estado
    { width: 'w-[50px]', cell: { type: 'action', align: 'center' }, header: { show: false } } // Acciones
  ];

  // --- JSX: Contenido del encabezado (sin cambios) ---
  const HeaderContent = (
    <div className="flex items-center justify-between mb-6">
      {/* Agrupa el título y la etiqueta de oficina */}
      <div className="flex items-center gap-x-2"> {/* Añade un div y gap */}
        <h1 className="text-2xl font-semibold">Cuentas para transferencias</h1>
        {/* Muestra la oficina del usuario si está disponible en la sesión */}
        {session?.user?.officeId && (
          <Badge variant="outline">
            {/* --- 5. Muestra nombre de oficina --- */}
            Oficina: {isLoadingOffices ? '...' : getOfficeName(session.user.officeId)}
          </Badge>
        )}
      </div>
      {/* Botones a la derecha */}
      <div className="flex gap-2">
        <Button
          onClick={() => fetchAccounts(true)}
          variant="outline"
          disabled={isRefreshing || (isLoading && accounts.length === 0)}
        >
          {isRefreshing ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Actualizando...</>
          ) : (
            'Actualizar'
          )}
        </Button>
        {/* El modal de creación también necesitará el token y saber la oficina */}
        <CreateTransferAccountModal onAccountCreated={() => fetchAccounts(true)} />
      </div>
    </div>
  );
  // --- FIN JSX HeaderContent ---

  // --- JSX: Skeleton del encabezado (sin cambios) ---
  const HeaderSkeleton = (
    <div className="flex items-center justify-between mb-6">
      <Skeleton className="h-8 w-64" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
  );
  // --- FIN JSX HeaderSkeleton ---

  // --- JSX: Contenido de la Tabla (sin cambios) ---
  const TableContent = accounts.length === 0 && !error ? ( // Muestra solo si no hay error
    <div className="flex flex-col justify-center items-center h-64 border rounded-md">
      <p className="text-lg text-muted-foreground mb-4">No hay cuentas registradas</p>
      <p className="text-sm text-muted-foreground">Crea una nueva cuenta usando el botón &quot;Nueva cuenta&quot;</p>
    </div>
  ) : (
    <TransferAccountsTable
      accounts={accounts} // Pasa las cuentas filtradas por oficina (desde el backend)
      onEdit={setEditingAccount}
      onDelete={setDeletingAccount}
      officeMap={officeMap}
    />
  );
  // --- FIN JSX TableContent ---

  // --- Renderizado Condicional por Sesión ---
  if (sessionStatus === "loading") {
    return (
      <div className="container mx-auto py-6">
        {HeaderSkeleton}
        <TableSkeleton columns={tableColumns} rowCount={6} />
      </div>
    );
  }
  if (sessionStatus === "unauthenticated") {
    return <div className="container mx-auto py-6"><p>Necesitas iniciar sesión para administrar las cuentas.</p></div>;
  }
  // --- FIN Renderizado Condicional por Sesión ---


  // --- Renderizado Principal ---
  return (
    <div className="container mx-auto py-6">
      {/* Usa SkeletonLoader para manejar el estado de carga del header */}
      <SkeletonLoader skeleton={HeaderSkeleton} isLoading={isLoading && accounts.length === 0}>
        {HeaderContent}
      </SkeletonLoader>

      {/* Usa SkeletonLoader para manejar el estado de carga de la tabla */}
      <SkeletonLoader skeleton={<TableSkeleton columns={tableColumns} rowCount={6} />} isLoading={isLoading && accounts.length === 0}>
        {error ? ( // Muestra error primero si existe
          <Card className="p-8 text-center"><p className="text-red-500">{error}</p></Card>
        ) : (
          TableContent // Muestra la tabla o el mensaje "No hay cuentas"
        )}
      </SkeletonLoader>

      {/* Modales */}
      <EditTransferAccountModal
        account={editingAccount}
        onClose={() => setEditingAccount(null)}
        onConfirm={handleEdit} // Ya tiene el token implícito por 'session'
      />
      <DeleteTransferAccountModal
        account={deletingAccount}
        isOpen={!!deletingAccount}
        onClose={() => setDeletingAccount(null)}
        onConfirm={handleDelete} // Ya tiene el token implícito por 'session'
      />
    </div>
  );
}