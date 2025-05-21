'use client'

import { useAuth } from '@/hooks/useAuth'
import { Loader2, LogOut, Moon, Sun } from "lucide-react";
import { SocketProvider } from "@/lib/SocketContext";
import { NotificationProvider } from "@/lib/NotificationContext";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Importación necesaria para anular el layout padre
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function SuperDashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { isLoading, isAuthenticated, user, logout, isSuperAdmin } = useAuth(true)
    const { setTheme, theme } = useTheme()
    const router = useRouter()
    const pathname = usePathname()

    // Redirigir si no es superadmin
    useEffect(() => {
        if (!isLoading && isAuthenticated && !isSuperAdmin) {
            router.push('/dashboard')
        }
    }, [isLoading, isAuthenticated, isSuperAdmin, router])

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="mr-2 h-12 w-12 animate-spin" />
            </div>
        )
    }

    if (!isAuthenticated || !isSuperAdmin) {
        return null
    }

    // Obtener iniciales para el avatar
    const initials = user?.name
        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
        : user?.email?.substring(0, 2).toUpperCase() || 'SU';

    return (
        <SocketProvider>
            <NotificationProvider>
                <div className="min-h-screen bg-background dark:bg-background">
                    {/* Header Super Admin */}
                    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <div className="container flex h-14 items-center justify-end">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="rounded-full"
                                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                >
                                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                                    <span className="sr-only">Cambiar tema</span>
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback>{initials}</AvatarFallback>
                                            </Avatar>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <div className="flex items-center justify-start gap-2 p-2">
                                            <div className="flex flex-col space-y-1 leading-none">
                                                <p className="font-medium">{user?.name || 'SuperAdmin'}</p>
                                                <p className="text-sm text-muted-foreground">{user?.email}</p>
                                            </div>
                                        </div>
                                        <DropdownMenuItem onClick={() => logout()} className="cursor-pointer">
                                            <LogOut className="mr-2 h-4 w-4" />
                                            <span>Cerrar sesión</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </header>
                    {/* Contenido principal */}
                    <main className="container py-6">
                        {children}
                    </main>
                </div>
            </NotificationProvider>
        </SocketProvider>
    )
} 