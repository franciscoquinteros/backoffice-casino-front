"use client"

import { useEffect, useState } from "react"
import { User } from "@/types/user"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Loader2 } from "lucide-react"
import { useOffices } from "@/components/hooks/use-offices"

// Definimos los enums según el backend
enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

// Roles disponibles en el sistema
const AVAILABLE_ROLES = [
  { value: "superadmin", label: "Super Administrador" },
  { value: "admin", label: "Administrador" },
  { value: "encargado", label: "Encargado" },
  { value: "operador", label: "Operador" }
]

interface EditUserModalProps {
  user: User
  isOpen: boolean
  onClose: () => void
  onSave: (updatedUser: Partial<User> & { isActive?: boolean }) => Promise<void>
  isLoading?: boolean
}

interface UserFormData {
  isActive: boolean
  withdrawal: 'enabled' | 'disabled'
  role: string
  office: string
}

export function EditUserModal({ user, isOpen, onClose, onSave, isLoading = false }: EditUserModalProps) {
  // Inicializar el estado con valores por defecto
  const [formData, setFormData] = useState<UserFormData>(() => ({
    isActive: user?.status === UserStatus.ACTIVE,
    withdrawal: user?.withdrawal || 'disabled',
    role: user?.role || "",
    office: user?.office ? user.office.toString() : "",
  }))
  const [isSaving, setIsSaving] = useState(false)

  // Utilizamos el hook para obtener las oficinas
  const { activeOffices, isLoading: isLoadingOffices } = useOffices()

  // Update form data when user changes
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        isActive: user.status === UserStatus.ACTIVE,
        withdrawal: user.withdrawal,
        role: user.role,
        office: user.office ? user.office.toString() : "",
      })
      setIsSaving(false)
    }
  }, [user, isOpen])

  // Update local loading state when parent loading state changes
  useEffect(() => {
    setIsSaving(isLoading)
  }, [isLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      // Creamos un objeto con las propiedades que acepte onSave
      const dataToSubmit: Partial<User> & { isActive?: boolean } = {
        isActive: formData.isActive,
        withdrawal: formData.withdrawal,
        role: formData.role
      };

      // Añadimos la oficina con la conversión apropiada
      if (formData.office) {
        // Siempre enviamos office como string, como lo espera el backend
        dataToSubmit.office = formData.office;
      }

      await onSave(dataToSubmit)
      // No cerramos el modal aquí, dejamos que el componente padre lo haga después de actualizar
    } catch (error) {
      console.error("Error al guardar usuario:", error)
      setIsSaving(false)
    }
  }

  // Prevenir renderizado si no hay usuario
  if (!user) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Solo permitir cerrar el modal si no está en proceso de guardado
      if (!isSaving && !open) {
        onClose()
      }
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Editar Usuario</DialogTitle>
          <DialogDescription>
            Modifica los datos del usuario {user.username}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Campos no editables */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Usuario</Label>
              <Input
                className="col-span-3"
                value={user.username}
                disabled
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Creación</Label>
              <Input
                className="col-span-3"
                value={new Date(user.createdAt).toLocaleDateString()}
                disabled
              />
            </div>

            {/* Campos editables */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Estado</Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  disabled={isSaving}
                />
                <span>{formData.isActive ? 'Activo' : 'Inactivo'}</span>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Retiros</Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.withdrawal === 'enabled'}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, withdrawal: checked ? 'enabled' : 'disabled' })
                  }
                  disabled={isSaving}
                />
                <span>{formData.withdrawal === 'enabled' ? 'Habilitado' : 'Deshabilitado'}</span>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Rol</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
                disabled={isSaving}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ROLES.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Oficina</Label>
              <Select
                value={formData.office}
                onValueChange={(value) => setFormData({ ...formData, office: value })}
                disabled={isSaving || isLoadingOffices}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={isLoadingOffices ? "Cargando oficinas..." : "Seleccionar oficina"} />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingOffices ? (
                    <SelectItem value="loading" disabled>Cargando oficinas...</SelectItem>
                  ) : activeOffices.length > 0 ? (
                    activeOffices.map(office => (
                      <SelectItem key={office.value} value={office.value}>
                        {office.label}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-offices" disabled>No hay oficinas disponibles</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cerrar
            </Button>
            <Button type="submit" disabled={isSaving || isLoadingOffices}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 