"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Office } from "@/components/hooks/use-offices"
import { useSession } from "next-auth/react"

interface DeleteOfficeModalProps {
    office: Office | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onOfficeDeleted: () => Promise<void>;
}

export function DeleteOfficeModal({ office, open, onOpenChange, onOfficeDeleted }: DeleteOfficeModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const { data: session, status: sessionStatus } = useSession()

    const handleDelete = async () => {
        if (!office) return;

        if (sessionStatus !== "authenticated" || !session?.accessToken) {
            toast.error("No estás autenticado.");
            return;
        }

        setIsLoading(true)

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/offices/${office.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })

            if (response.status === 401) {
                toast.error("Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.");
                return;
            }

            if (response.status === 403) {
                toast.error("No tienes permisos para eliminar esta oficina.");
                return;
            }

            if (response.ok) {
                toast.success("Oficina eliminada exitosamente")
                await onOfficeDeleted()
                // Solo cerramos el modal después de que todo se ha completado correctamente
                setTimeout(() => {
                    onOpenChange(false)
                }, 10)
            } else {
                const errorData = await response.json().catch(() => ({ message: "Error desconocido" }))
                toast.error(`Error al eliminar oficina: ${errorData.message || response.statusText}`)
            }
        } catch (error) {
            console.error("Error deleting office:", error)
            toast.error("Error al eliminar oficina. Intenta nuevamente.")
        } finally {
            setIsLoading(false)
        }
    }

    // Manejador específico para el cierre del modal
    const handleOpenChange = (newOpen: boolean) => {
        // Evitar que el modal se cierre durante la carga
        if (!newOpen && isLoading) {
            return;
        }

        // Si estamos cerrando el modal, asegurarse de que se limpie correctamente
        if (!newOpen && !isLoading) {
            // Pequeño retraso para asegurar que la animación termine correctamente
            setTimeout(() => {
                onOpenChange(newOpen);
            }, 10);
        } else {
            onOpenChange(newOpen);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Eliminar Oficina</DialogTitle>
                    <DialogDescription>
                        ¿Estás seguro de que deseas eliminar esta oficina? Esta acción no se puede deshacer.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => {
                            if (!isLoading) {
                                onOpenChange(false);
                            }
                        }}
                        disabled={isLoading}
                    >
                        Cancelar
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
                        {isLoading ? "Eliminando..." : "Eliminar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}