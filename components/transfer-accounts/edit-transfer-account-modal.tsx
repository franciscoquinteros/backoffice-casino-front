'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { TransferAccount } from '@/types/transfer-account'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const formSchema = z.object({
  userName: z.string().min(1, 'El nombre es requerido'),
  office: z.string().min(1, 'La oficina es requerida'),
  cbu: z.string().min(1, 'El CBU es requerido'),
  alias: z.string().min(1, 'El alias es requerido'),
  wallet: z.enum(['mercadopago', 'paypal']),
  operator: z.string().min(1, 'El operador es requerido'),
  agent: z.string().min(1, 'El agente es requerido'),
  isActive: z.boolean(),
  mp_client_id: z.string().optional(),
  mp_client_secret: z.string().optional(),
})

interface EditTransferAccountModalProps {
  account: TransferAccount | null
  onClose: () => void
  onConfirm: (account: TransferAccount) => Promise<void>
}

export function EditTransferAccountModal({
  account,
  onClose,
  onConfirm,
}: EditTransferAccountModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userName: account?.userName || '',
      office: account?.office || '',
      cbu: account?.cbu || '',
      alias: account?.alias || '',
      wallet: account?.wallet || 'mercadopago',
      operator: account?.operator || '',
      agent: account?.agent || '',
      isActive: account?.isActive ?? true,
      mp_client_id: account?.mp_client_id || '',
      mp_client_secret: account?.mp_client_secret || '',
    },
  })

  useEffect(() => {
    if (account) {
      form.reset({
        userName: account.userName,
        office: account.office,
        cbu: account.cbu,
        alias: account.alias,
        wallet: account.wallet,
        operator: account.operator,
        agent: account.agent,
        isActive: account.isActive,
        mp_client_id: account.mp_client_id || '',
        mp_client_secret: account.mp_client_secret || '',
      })
    }
  }, [account, form])

  const watchWallet = form.watch('wallet')

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!account || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onConfirm({
        ...account,
        ...values,
      })
      onClose()
    } catch (error) {
      console.error('Error al guardar la cuenta:', error)
      toast.error(`Error al guardar la cuenta: ${error instanceof Error ? error.message : 'Intenta nuevamente'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={!!account} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar cuenta de transferencia</DialogTitle>
          <DialogDescription>
            Modifica los datos de la cuenta de transferencia.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="userName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="office"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Oficina</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cbu"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CBU</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="alias"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alias</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="wallet"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de billetera</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="operator"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Operador</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="agent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agente</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {watchWallet === 'mercadopago' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="mp_client_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>MP Client ID</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mp_client_secret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>MP Client Secret</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Estado</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <div className="flex justify-end gap-3 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={(open) => !open && !isSubmitting && onClose()}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 