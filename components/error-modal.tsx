// components/error-modal.tsx
"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import { useEffect } from "react";

interface ErrorModalProps {
    isOpen: boolean;
    title: string;
    description: string;
    onClose: () => void;
}

// En el componente ErrorModal, agregamos logs para depuración
export function ErrorModal({ isOpen, title, description, onClose }: ErrorModalProps) {
    console.log("Renderizando ErrorModal con props:", { isOpen, title, description });

    useEffect(() => {
        if (isOpen) {
            console.log("ErrorModal está abierto con título:", title);
        }
    }, [isOpen, title]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center text-red-600 gap-2">
                        <XCircle className="h-5 w-5" />
                        {title}
                    </DialogTitle>
                    <DialogDescription className="pt-2">
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex justify-end">
                    <Button variant="default" onClick={onClose}>
                        Cerrar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}