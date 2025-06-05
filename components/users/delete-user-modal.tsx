"use client"

import { useState } from "react"
import { User } from "@/types/user"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Trash2Icon } from "lucide-react"

interface DeleteUserModalProps {
  user: User
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  isLoading: boolean
  currentUserRole?: string // Agregamos el rol del usuario actual
}

export function DeleteUserModal({
  user,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  currentUserRole
}: DeleteUserModalProps) {
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async (e: React.MouseEvent) => {
    // Prevenir el comportamiento por defecto que cerraría el diálogo
    e.preventDefault()

    setError(null)

    try {
      await onConfirm()
      // No cerramos el modal aquí, se cerrará desde el componente padre
      // cuando la operación se complete correctamente
    } catch (error) {
      console.error("Error al eliminar usuario:", error)
      setError("Ocurrió un error al eliminar el usuario")
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2Icon className="h-5 w-5" />
            Eliminar usuario
          </AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que deseas eliminar al usuario <strong>{user.username}</strong>?
            <br />
            <br />
            {currentUserRole === 'admin' && user.role === 'superadmin' ? (
              <span className="text-red-600 font-medium">
                ⚠️ Los administradores no pueden eliminar usuarios superadministradores.
              </span>
            ) : (
              <>
                Esta acción no se puede deshacer y eliminará permanentemente toda la información
                asociada a este usuario.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <div className="text-sm text-red-500 mt-1">{error}</div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isLoading}
          >
            Cancelar
          </AlertDialogCancel>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || (currentUserRole === 'admin' && user.role === 'superadmin')}
            className="bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? "Eliminando..." : "Eliminar usuario"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 