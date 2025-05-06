'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useState, useEffect } from 'react'
import { Loader2, PlusCircle, Info } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Define el schema Zod actualizado para que coincida con los campos del formulario
const formSchema = z.object({
    id: z.string().min(1, 'El ID es requerido'),
    name: z.string().min(1, 'El nombre es requerido'),
    // Agrega los nuevos campos que aparecen en el formulario
    whatsapp: z.string().optional(),
    telegram: z.string().optional(),
    firstDepositBonus: z.string().optional(),
    perpetualBonus: z.string().optional(),
    minDeposit: z.string().optional(),
    minWithdrawal: z.string().optional(),
    minWithdrawalWait: z.string().optional(),
    status: z.enum(['active', 'inactive']),
    // Campos para el administrador
    agentAssigned: z.string().email('Debe ser un email válido').min(1, 'Email del administrador requerido'),
    adminPassword: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

interface CreateOfficeModalProps {
    onOfficeCreated: () => void;
}

export function CreateOfficeModal({ onOfficeCreated }: CreateOfficeModalProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { data: session, status: sessionStatus } = useSession();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            id: "",
            name: "",
            whatsapp: "",
            telegram: "",
            firstDepositBonus: "",
            perpetualBonus: "",
            minDeposit: "",
            minWithdrawal: "",
            minWithdrawalWait: "",
            status: "active",
            agentAssigned: "",
            adminPassword: "",
        },
    });

    // Efecto para resetear el form al cerrar el modal
    useEffect(() => {
        if (!open) {
            form.reset({
                id: "",
                name: "",
                whatsapp: "",
                telegram: "",
                firstDepositBonus: "",
                perpetualBonus: "",
                minDeposit: "",
                minWithdrawal: "",
                minWithdrawalWait: "",
                status: "active",
                agentAssigned: "",
                adminPassword: "",
            });
        }
    }, [open, form]);

    async function onSubmit(data: z.infer<typeof formSchema>) {
        if (sessionStatus !== "authenticated" || !session?.accessToken) {
            toast.error("No estás autenticado.");
            return;
        }
        const token = session.accessToken;

        setIsLoading(true);

        try {
            // Prepara datos para la oficina
            const officePayload = {
                id: data.id,
                name: data.name,
                whatsapp: data.whatsapp || null,
                telegram: data.telegram || null,
                firstDepositBonus: data.firstDepositBonus || null,
                perpetualBonus: data.perpetualBonus || null,
                minDeposit: data.minDeposit || null,
                minWithdrawal: data.minWithdrawal || null,
                minWithdrawalWait: data.minWithdrawalWait || null,
                status: data.status,
                agentAssigned: data.agentAssigned,
            };
            console.log("Payload para Crear Oficina:", officePayload);

            // 1. Crear la Oficina
            const officeResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/offices`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(officePayload),
            });

            if (officeResponse.status === 401) { throw new Error("Tu sesión ha expirado."); }
            if (officeResponse.status === 403) { throw new Error("No tienes permiso para crear oficinas."); }
            if (!officeResponse.ok) {
                const errorData = await officeResponse.json().catch(() => ({ message: 'Error desconocido al crear oficina' }));
                throw new Error(errorData.message || `Error ${officeResponse.status}`);
            }
            const createdOffice = await officeResponse.json();
            console.log("Oficina creada:", createdOffice);

            // 2. Crear el Usuario Administrador para esa Oficina
            const userPayload = {
                username: data.agentAssigned.split('@')[0],
                email: data.agentAssigned,
                password: data.adminPassword,
                role: 'admin',
                office: createdOffice.id
            };
            console.log("Payload para Crear Usuario:", userPayload);

            const userResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(userPayload),
            });

            if (userResponse.status === 401) { throw new Error("Tu sesión ha expirado (creando usuario)."); }
            if (userResponse.status === 403) { throw new Error("No tienes permiso para crear usuarios."); }
            if (!userResponse.ok) {
                const errorData = await userResponse.json().catch(() => ({ message: "Error desconocido al crear usuario" }));
                throw new Error(errorData.message || `Error ${userResponse.status}`);
            }

            toast.success("Oficina y Administrador creados exitosamente");
            await onOfficeCreated();
            setOpen(false);

        } catch (error: unknown) {
            console.error("Error en onSubmit:", error);
            toast.error(error instanceof Error ? error.message : "Ocurrió un error inesperado.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2"> <PlusCircle className="h-4 w-4" /> <span>Nueva Oficina</span> </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[800px] w-[90vw]">
                <DialogHeader>
                    <DialogTitle>Crear Nueva Oficina</DialogTitle>
                    <DialogDescription> Completa los campos requeridos (*) para crear la oficina y su administrador inicial. </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4 py-4">

                            <FormField control={form.control} name="id" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-1">ID Personalizado * <TooltipInfo text="ID único (ej: número o código corto) usado para integraciones." /></FormLabel>
                                    <FormControl><Input placeholder="Ej: 5 o BairesSur" {...field} disabled={isLoading} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre Oficina *</FormLabel>
                                    <FormControl><Input placeholder="Ej: Oficina Buenos Aires" {...field} disabled={isLoading} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="agentAssigned" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email Administrador *</FormLabel>
                                    <FormControl><Input type="email" placeholder="admin.oficina@email.com" {...field} disabled={isLoading} /></FormControl>
                                    <FormDescription>Este será el usuario 'admin' inicial para esta oficina.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="adminPassword" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contraseña Administrador *</FormLabel>
                                    <FormControl><Input type="password" placeholder="Mínimo 6 caracteres" {...field} disabled={isLoading} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="whatsapp" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>WhatsApp (Opcional)</FormLabel>
                                    <FormControl><Input placeholder="Número de contacto" {...field} disabled={isLoading} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="telegram" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Telegram (Opcional)</FormLabel>
                                    <FormControl><Input placeholder="Usuario o número" {...field} disabled={isLoading} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="firstDepositBonus" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bono 1er Depósito (%) (Opcional)</FormLabel>
                                    <FormControl><Input type="text" placeholder="Ej: 100" {...field} disabled={isLoading} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="perpetualBonus" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bono Perpetuo (%) (Opcional)</FormLabel>
                                    <FormControl><Input type="text" placeholder="Ej: 10" {...field} disabled={isLoading} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="minDeposit" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Depósito Mínimo (Opcional)</FormLabel>
                                    <FormControl><Input type="text" placeholder="Ej: 1000" {...field} disabled={isLoading} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="minWithdrawal" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Retiro Mínimo (Opcional)</FormLabel>
                                    <FormControl><Input type="text" placeholder="Ej: 2000" {...field} disabled={isLoading} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="minWithdrawalWait" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Espera Retiro (Minutos) (Opcional)</FormLabel>
                                    <FormControl><Input type="text" placeholder="Ej: 30" {...field} disabled={isLoading} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="status" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-4 md:mt-auto">
                                    <div className="space-y-0.5"> <FormLabel>Estado Activo</FormLabel> </div>
                                    <FormControl><Switch checked={field.value === 'active'} onCheckedChange={(checked) => field.onChange(checked ? 'active' : 'inactive')} disabled={isLoading} /></FormControl>
                                </FormItem>
                            )} />

                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}> Cancelar </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isLoading ? "Creando..." : "Crear Oficina"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

// Componente helper para Tooltip
const TooltipInfo = ({ text }: { text: string }) => (
    <TooltipProvider delayDuration={100}>
        <Tooltip>
            <TooltipTrigger type="button" onClick={(e) => e.preventDefault()} className="inline-flex items-center justify-center">
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
                <p>{text}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);