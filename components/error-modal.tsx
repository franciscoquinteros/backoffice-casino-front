// components/simple-error-modal.tsx
"use client";

import { useEffect } from 'react';
import { Button } from "@/components/ui/button";

interface SimpleErrorModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export function SimpleErrorModal({ isOpen, title, message, onClose }: SimpleErrorModalProps) {
  // Log para depuración

  useEffect(() => {
    console.log("SimpleErrorModal effect, isOpen changed to:", isOpen);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold text-red-600">{title}</h2>
        <p className="mt-2">{message}</p>
        <div className="mt-4 flex justify-end">
          <Button onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </div>
  );
}