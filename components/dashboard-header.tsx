// Ejemplo: components/layout/dashboard-header.tsx
"use client";

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
// --- 1. Importa el selector ---
import { OfficeSelector } from './office-selector'; // <-- Ajusta la ruta a donde guardaste OfficeSelector.tsx

export function DashboardHeader() {
    // --- 2. Obtén la sesión aquí también ---
    const { data: session, status } = useSession();

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center">
                <div className="mr-4 hidden md:flex">
                    <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
                        {/* <Icons.logo className="h-6 w-6" /> */}
                        <span className="hidden font-bold sm:inline-block">
                            Cocos Admin
                        </span>
                    </Link>
                    {/* ... otros links de navegación ... */}
                </div>

                <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
                    {/* --- 3. Renderiza el selector condicionalmente --- */}
                    {status === 'authenticated' && session.user?.role === 'superadmin' && (
                        <OfficeSelector />
                    )}
                    {/* --- Fin Selector --- */}

                    <nav className="flex items-center">
                        {/* ... otros iconos/botones ... */}
                        {status === 'authenticated' && (
                            <Button onClick={() => signOut()} variant="outline" size="sm">Cerrar Sesión</Button>
                        )}
                    </nav>
                </div>
            </div>
        </header>
    );
}