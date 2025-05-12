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
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { PasswordVerificationModal } from '@/components/password-verification-modal'
import { usePasswordVerification } from '@/hooks/usePasswordVerification'

const formSchema = z.object({
  userName: z.string().min(1, 'El nombre es requerido'),
  office: z.string().min(1, 'La oficina es requerida'),
  cbu: z.string().min(1, 'El CBU es requerido'),
  alias: z.string().min(1, 'El alias es requerido'),
  wallet: z.literal('mercadopago'),
  operator: z.string().min(1, 'El operador es requerido'),
  agent: z.string().min(1, 'El agente es requerido'),
  isActive: z.boolean(),
  mp_client_id: z.string().optional(),
  mp_client_secret: z.string().optional(),
  mp_public_key: z.string().optional(),
  mp_access_token: z.string().optional(),
  receiver_id: z.string().optional(),
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
  const [showClientId, setShowClientId] = useState(false)
  const [showClientSecret, setShowClientSecret] = useState(false)
  const [showPublicKey, setShowPublicKey] = useState(false)
  const [showAccessToken, setShowAccessToken] = useState(false)

  const {
    verifyingField,
    startVerification,
    cancelVerification,
    handleVerificationResult,
    isFieldVerified,
    userEmail
  } = usePasswordVerification()

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
      mp_public_key: account?.mp_public_key || '',
      mp_access_token: account?.mp_access_token || '',
      receiver_id: account?.receiver_id || '',
    },
  })

  useEffect(() => {
    if (account) {
      // Reset form with account data
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
        mp_public_key: account.mp_public_key || '',
        mp_access_token: account.mp_access_token || '',
        receiver_id: account.receiver_id || '',
      });

      // Set initial visibility states based on verification status
      setShowClientId(isFieldVerified('mp_client_id'));
      setShowClientSecret(isFieldVerified('mp_client_secret'));
      setShowPublicKey(isFieldVerified('mp_public_key'));
      setShowAccessToken(isFieldVerified('mp_access_token'));
    }
  }, [account, form]);

  useEffect(() => {
    if (account) {
      setShowClientId(isFieldVerified('mp_client_id'));
      setShowClientSecret(isFieldVerified('mp_client_secret'));
      setShowPublicKey(isFieldVerified('mp_public_key'));
      setShowAccessToken(isFieldVerified('mp_access_token'));
    }
  }, [account, isFieldVerified]);

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

  // Manejadores para mostrar/ocultar campos sensibles con verificación
  const handleToggleClientId = () => {
    if (showClientId) {
      setShowClientId(false)
    } else if (isFieldVerified('mp_client_id')) {
      setShowClientId(true)
    } else {
      startVerification('mp_client_id')
    }
  }

  const handleToggleClientSecret = () => {
    if (showClientSecret) {
      setShowClientSecret(false)
    } else if (isFieldVerified('mp_client_secret')) {
      setShowClientSecret(true)
    } else {
      startVerification('mp_client_secret')
    }
  }

  const handleTogglePublicKey = () => {
    if (showPublicKey) {
      setShowPublicKey(false)
    } else if (isFieldVerified('mp_public_key')) {
      setShowPublicKey(true)
    } else {
      startVerification('mp_public_key')
    }
  }

  const handleToggleAccessToken = () => {
    if (showAccessToken) {
      setShowAccessToken(false)
    } else if (isFieldVerified('mp_access_token')) {
      setShowAccessToken(true)
    } else {
      startVerification('mp_access_token')
    }
  }

  // Manejador para la verificación exitosa
  const handleVerificationSuccess = (success: boolean) => {
    if (verifyingField) {
      handleVerificationResult(verifyingField, success)

      // Si la verificación fue exitosa, mostrar el campo correspondiente
      if (success) {
        switch (verifyingField) {
          case 'mp_client_id':
            setShowClientId(true)
            form.setValue('mp_client_id', account?.mp_client_id || '')
            break
          case 'mp_client_secret':
            setShowClientSecret(true)
            form.setValue('mp_client_secret', account?.mp_client_secret || '')
            break
          case 'mp_public_key':
            setShowPublicKey(true)
            form.setValue('mp_public_key', account?.mp_public_key || '')
            break
          case 'mp_access_token':
            setShowAccessToken(true)
            form.setValue('mp_access_token', account?.mp_access_token || '')
            break
        }
      }
    }
  }

  // Obtener el nombre amigable del campo para mostrar en el modal
  const getFieldDisplayName = (fieldName: string) => {
    switch (fieldName) {
      case 'mp_client_id':
        return 'MP Client ID'
      case 'mp_client_secret':
        return 'MP Client Secret'
      case 'mp_public_key':
        return 'Public Key'
      case 'mp_access_token':
        return 'Access Token'
      default:
        return fieldName
    }
  }

  return (
    <>
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
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="mp_client_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>MP Client ID</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input
                                {...field}
                                type={showClientId ? "text" : "password"}
                                disabled={isSubmitting}
                                className="pr-10"
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={handleToggleClientId}
                              tabIndex={-1}
                            >
                              {showClientId ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                              <span className="sr-only">
                                {showClientId ? "Ocultar" : "Mostrar"} Client ID
                              </span>
                            </Button>
                          </div>
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
                          <div className="relative">
                            <FormControl>
                              <Input
                                {...field}
                                type={showClientSecret ? "text" : "password"}
                                disabled={isSubmitting}
                                className="pr-10"
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={handleToggleClientSecret}
                              tabIndex={-1}
                            >
                              {showClientSecret ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                              <span className="sr-only">
                                {showClientSecret ? "Ocultar" : "Mostrar"} Client Secret
                              </span>
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="mp_public_key"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Public Key</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input
                                {...field}
                                type={showPublicKey ? "text" : "password"}
                                disabled={isSubmitting}
                                className="pr-10"
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={handleTogglePublicKey}
                              tabIndex={-1}
                            >
                              {showPublicKey ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                              <span className="sr-only">
                                {showPublicKey ? "Ocultar" : "Mostrar"} Public Key
                              </span>
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mp_access_token"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Access Token</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input
                                {...field}
                                type={showAccessToken ? "text" : "password"}
                                disabled={isSubmitting}
                                className="pr-10"
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={handleToggleAccessToken}
                              tabIndex={-1}
                            >
                              {showAccessToken ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                              <span className="sr-only">
                                {showAccessToken ? "Ocultar" : "Mostrar"} Access Token
                              </span>
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}

              <FormField
                control={form.control}
                name="receiver_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User ID (MP)</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                  onClick={onClose}
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

      {/* Modal de verificación de contraseña */}
      {verifyingField && (
        <PasswordVerificationModal
          isOpen={!!verifyingField}
          onClose={cancelVerification}
          onVerify={handleVerificationSuccess}
          fieldName={getFieldDisplayName(verifyingField)}
          userEmail={userEmail}
        />
      )}
    </>
  )
}