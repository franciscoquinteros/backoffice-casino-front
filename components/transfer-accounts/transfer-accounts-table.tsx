'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TransferAccount } from '@/types/transfer-account'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useState } from 'react'

interface TransferAccountsTableProps {
  accounts: TransferAccount[]
  onEdit: (account: TransferAccount) => void
  onDelete: (account: TransferAccount) => void
  officeMap: Map<string, string>;
}

export function TransferAccountsTable({
  accounts,
  onEdit,
  onDelete,
  officeMap,
}: TransferAccountsTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const handleAction = async (action: 'edit' | 'delete', account: TransferAccount) => {
    setOpenMenuId(null)
    if (action === 'edit') {
      onEdit(account)
    } else {
      onDelete(account)
    }
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Oficina</TableHead>
            <TableHead>CBU</TableHead>
            <TableHead>Alias</TableHead>
            <TableHead>Billetera</TableHead>
            <TableHead>Operador</TableHead>
            <TableHead>Agente</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => (
            <TableRow key={account.id}>
              <TableCell>{account.userName}</TableCell>
              <TableCell>{officeMap.get(account.office?.toString() ?? '') || account.office || 'N/A'}</TableCell>
              <TableCell>{account.cbu}</TableCell>
              <TableCell>{account.alias}</TableCell>
              <TableCell>
                <Badge variant="outline">
                  {account.wallet === 'mercadopago' ? 'Mercado Pago' : 'PayPal'}
                </Badge>
              </TableCell>
              <TableCell>{account.operator}</TableCell>
              <TableCell>{account.agent}</TableCell>
              <TableCell>
                <Badge variant={account.isActive ? 'default' : 'secondary'}>
                  {account.isActive ? 'Activa' : 'Inactiva'}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu
                  open={openMenuId === account.id}
                  onOpenChange={(open) => setOpenMenuId(open ? account.id : null)}
                >
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Abrir menú</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleAction('edit', account)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      <span>Editar</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleAction('delete', account)}
                      className="text-red-600 focus:text-red-600 focus:bg-red-50"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Eliminar</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
} 