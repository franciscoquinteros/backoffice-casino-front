import React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
}

export function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    className = '',
}: PaginationProps) {
    // No mostrar paginación si solo hay 1 página
    if (totalPages <= 1) return null;

    // Calcular rangos para mostrar los números de página
    const renderPageNumbers = () => {
        const pages: (number | string)[] = [];

        // Primera página siempre visible
        pages.push(1);

        // Calcular rango visible alrededor de la página actual
        let rangeStart = Math.max(2, currentPage - 1);
        let rangeEnd = Math.min(totalPages - 1, currentPage + 1);

        // Ajustar para mostrar 5 números siempre que sea posible
        if (rangeEnd - rangeStart < 2) {
            if (rangeStart === 2) {
                rangeEnd = Math.min(totalPages - 1, rangeEnd + 1);
            } else if (rangeEnd === totalPages - 1) {
                rangeStart = Math.max(2, rangeStart - 1);
            }
        }

        // Agregar ellipsis si es necesario antes del rango
        if (rangeStart > 2) {
            pages.push('ellipsis-start');
        }

        // Agregar números de página en el rango calculado
        for (let i = rangeStart; i <= rangeEnd; i++) {
            pages.push(i);
        }

        // Agregar ellipsis si es necesario después del rango
        if (rangeEnd < totalPages - 1) {
            pages.push('ellipsis-end');
        }

        // Última página siempre visible (si hay más de una página)
        if (totalPages > 1) {
            pages.push(totalPages);
        }

        return pages;
    };

    return (
        <div className={`flex items-center justify-center space-x-2 py-4 ${className}`}>
            <Button
                variant="outline"
                size="icon"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
            >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Página anterior</span>
            </Button>

            {renderPageNumbers().map((page, index) => {
                if (page === 'ellipsis-start' || page === 'ellipsis-end') {
                    return (
                        <div key={`${page}-${index}`} className="flex items-center justify-center h-9 w-9">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </div>
                    );
                }

                return (
                    <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="icon"
                        onClick={() => onPageChange(page as number)}
                        className="h-9 w-9"
                    >
                        {page}
                    </Button>
                );
            })}

            <Button
                variant="outline"
                size="icon"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
            >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Página siguiente</span>
            </Button>
        </div>
    );
} 