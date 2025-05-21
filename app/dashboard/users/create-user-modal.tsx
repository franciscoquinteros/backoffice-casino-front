"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { toast } from "sonner"
import { PlusCircle } from "lucide-react"
import { useOffices } from "@/components/hooks/use-offices"
import { useSession } from "next-auth/react"

interface CreateUserModalProps {
    onUserCreated: () => Promise<void>
    userType: 'internal' | 'external'
    allowOfficeSelection?: boolean // Nueva prop para permitir selección de oficina
}

export function CreateUserModal({ onUserCreated, userType, allowOfficeSelection = false }: CreateUserModalProps) {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const { data: session, status: sessionStatus } = useSession();
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        role: "",
        office: session?.user?.officeId ? session.user.officeId.toString() : "",
        status: "active",
        password: "",
    })

    // Usamos el hook de oficinas cuando se permite la selección de oficina (para SuperAdmin)
    const { offices, isLoading: isLoadingOffices } = useOffices()

    // Inicializar oficina del usuario al abrir el modal
    useEffect(() => {
        if (session?.user?.officeId && !allowOfficeSelection) {
            setFormData(prev => ({ ...prev, office: session.user.officeId.toString() }))
        }
    }, [session?.user?.officeId, allowOfficeSelection])

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()


        if (!formData.username || !formData.email || !formData.role || !formData.office || !formData.password) {
            toast.error("Por favor completa todos los campos requeridos")
            return
        }

        setIsLoading(true)
        // --- Verificación de Sesión y Token ---
        if (sessionStatus !== "authenticated" || !session?.accessToken) {
            toast.error("Autenticación requerida para crear usuario.");
            setIsLoading(false);
            return;
        }
        const accessToken = session.accessToken;
        // --- Fin Verificación ---

        try {
            // Usar el endpoint correspondiente según el tipo de usuario
            const endpoint = userType === 'internal' ? 'users' : 'external-users'

            // Enviamos los datos sin conversión a número
            const dataToSubmit = {
                ...formData
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify(dataToSubmit),
            })

            if (response.ok) {
                toast.success(`${userType === 'internal' ? 'Usuario interno' : 'Usuario externo'} creado correctamente`)
                setFormData({
                    username: "",
                    email: "",
                    role: "",
                    office: allowOfficeSelection ? "" : (session?.user?.officeId ? session.user.officeId.toString() : ""),
                    status: "active",
                    password: "",
                })
                setOpen(false)
                await onUserCreated()
            } else {
                const errorData = await response.json().catch(() => ({ message: "Error desconocido" }))
                toast.error(`Error al crear usuario: ${errorData.message || response.statusText}`)
            }
        } catch (error) {
            console.error("Error creating user:", error)
            toast.error("Error al crear usuario. Intenta nuevamente.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <PlusCircle className="h-4 w-4" />
                    <span>Nuevo {userType === 'internal' ? 'Usuario Interno' : 'Usuario Externo'}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Crear {userType === 'internal' ? 'Usuario Interno' : 'Usuario Externo'}</DialogTitle>
                    <DialogDescription>
                        Completa el formulario para crear un nuevo {userType === 'internal' ? 'usuario interno' : 'usuario externo'}.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="username" className="text-right">
                                Nombre
                            </Label>
                            <Input
                                id="username"
                                className="col-span-3"
                                value={formData.username}
                                onChange={(e) => handleChange("username", e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-right">
                                Email
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                className="col-span-3"
                                value={formData.email}
                                onChange={(e) => handleChange("email", e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="password" className="text-right">
                                Contraseña
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                className="col-span-3"
                                value={formData.password}
                                onChange={(e) => handleChange("password", e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="role" className="text-right">
                                Rol
                            </Label>
                            <Select
                                value={formData.role}
                                onValueChange={(value) => handleChange("role", value)}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Seleccionar rol" />
                                </SelectTrigger>
                                <SelectContent>
                                    {userType === 'internal' ? (
                                        <>
                                            <SelectItem value="admin">Administrador</SelectItem>
                                            <SelectItem value="encargado">Encargado</SelectItem>
                                            <SelectItem value="operador">Operador</SelectItem>
                                        </>
                                    ) : (
                                        <>
                                            <SelectItem value="admin">Administrador</SelectItem>
                                            <SelectItem value="user">Usuario</SelectItem>
                                            <SelectItem value="viewer">Visualizador</SelectItem>
                                            <SelectItem value="client">Cliente</SelectItem>
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="office" className="text-right">
                                Oficina
                            </Label>
                            {allowOfficeSelection ? (
                                // Select de oficinas para SuperAdmin
                                <Select
                                    value={formData.office}
                                    onValueChange={(value) => handleChange("office", value)}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder={isLoadingOffices ? "Cargando..." : "Seleccionar oficina"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {isLoadingOffices ? (
                                            <SelectItem value="" disabled>Cargando oficinas...</SelectItem>
                                        ) : (
                                            offices?.map((office) => (
                                                <SelectItem key={office.id} value={office.id.toString()}>
                                                    {office.name} ({office.id})
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            ) : (
                                // Input deshabilitado para usuarios normales
                                <Input
                                    id="office"
                                    className="col-span-3"
                                    value={session?.user?.officeId ? session.user.officeId.toString() : ""}
                                    disabled
                                />
                            )}
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="status" className="text-right">
                                Estado
                            </Label>
                            <Select
                                value={formData.status}
                                onValueChange={(value) => handleChange("status", value)}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Seleccionar estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Activo</SelectItem>
                                    <SelectItem value="inactive">Inactivo</SelectItem>
                                    <SelectItem value="pending">Pendiente</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading || isLoadingOffices}>
                            {isLoading ? "Creando..." : "Crear usuario"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}