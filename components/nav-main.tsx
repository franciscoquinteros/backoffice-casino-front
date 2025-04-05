// components/nav-main.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  isActive?: boolean;
  items?: {
    title: string;
    url: string;
    icon?: React.ElementType;
  }[];
}

interface NavMainProps {
  items: NavItem[];
  blockTitle?: string;
}

export function NavMain({ items, blockTitle }: NavMainProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Verificar si una ruta está activa
  const isActive = (url: string): boolean => {
    if (pathname === url) return true;
    if (url !== '/' && pathname.startsWith(`${url}/`)) return true;
    return false;
  };

  // Verificar si un item tiene subitems activos
  const hasActiveSubItem = (item: NavItem): boolean => {
    return !!item.items?.some(subItem => isActive(subItem.url));
  };

  // Inicializar el estado de expansión para los items con subitems activos
  const initializeExpandedState = () => {
    const initialExpandedState: Record<string, boolean> = {};

    items.forEach(item => {
      if (item.items && (hasActiveSubItem(item) || isActive(item.url))) {
        initialExpandedState[item.title] = true;
      }
    });

    return initialExpandedState;
  };

  // Establecer el estado inicial solo una vez
  useState(() => {
    setExpandedItems(initializeExpandedState());
  });

  // Función para alternar la expansión de un item
  const toggleItemExpansion = (title: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  return (
    <div className="mb-6">
      {blockTitle && (
        <h3 className="text-xs font-medium text-muted-foreground px-4 mb-2">
          {blockTitle}
        </h3>
      )}
      <nav className="grid gap-1 px-2">
        {items.map((item) => {
          const isItemActive = isActive(item.url) || hasActiveSubItem(item);
          const isExpanded = expandedItems[item.title] || false;
          const Icon = item.icon;

          return (
            <div key={item.title} className="w-full">
              {/* Item principal */}
              <div
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer",
                  isItemActive && "bg-accent/50"
                )}
                onClick={() => {
                  if (item.items?.length) {
                    toggleItemExpansion(item.title);
                  }
                }}
              >
                {Icon && <Icon className="h-4 w-4" />}
                <span className="flex-1">{item.title}</span>
                {item.items?.length ? (
                  isExpanded ?
                    <ChevronDown className="h-4 w-4 text-muted-foreground" /> :
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                ) : null}
              </div>

              {/* Subitems (si existen y está expandido) */}
              {item.items?.length && isExpanded && (
                <div className="pl-6 mt-1">
                  {item.items.map((subItem) => {
                    const isSubItemActive = isActive(subItem.url);
                    const SubIcon = subItem.icon;

                    return (
                      <Link
                        key={subItem.title}
                        href={subItem.url}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
                          isSubItemActive && "bg-accent/50 text-accent-foreground"
                        )}
                      >
                        {SubIcon && <SubIcon className="h-4 w-4" />}
                        <span>{subItem.title}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}