'use client'

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from "lucide-react";
import { SocketProvider } from "@/lib/SocketContext";
import { NotificationProvider } from "@/lib/NotificationContext";
import { DashboardNavigation } from "@/components/dashboard-navigation";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { isLoading, isAuthenticated } = useAuth(true)
    const pathname = usePathname();

    // Si estamos en la ruta de superadmin, no aplicar este layout
    if (pathname?.startsWith('/dashboard/super')) {
        return children;
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="mr-2 h-12 w-12 animate-spin" />
            </div>
        )
    }

    if (!isAuthenticated) {
        return null
    }

    return (
        <SocketProvider>
            <NotificationProvider>
                <SidebarProvider>
                    <AppSidebar />
                    <SidebarInset>
                        <header className="flex h-16 shrink-0 items-center gap-2 justify-between px-4">
                            <div className="flex items-center gap-2">
                                <SidebarTrigger className="-ml-1" />
                            </div>
                            <ModeToggle />
                        </header>
                        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                            <DashboardNavigation>
                                {children}
                            </DashboardNavigation>
                        </div>
                    </SidebarInset>
                </SidebarProvider>
            </NotificationProvider>
        </SocketProvider>
    )
}