"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";
import { CircleCheck, Info, TriangleAlert, CircleX } from "lucide-react";
import { toasterMounted } from "@/lib/toast";
import { Spinner } from "./spinner";

/**
 * Toasts arriba al centro (la barra de pestañas ocupa abajo), 3 s, con la safe area de arriba.
 * Clases sobre tokens: superficie elevada, tinta, ícono con el tono.
 */
export default function ToasterInner() {
  const { resolvedTheme } = useTheme();
  // Los efectos de los hijos corren antes: sonner ya se suscribió a la cola.
  useEffect(() => toasterMounted(), []);
  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="top-center"
      duration={3000}
      offset={{ top: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      mobileOffset={{ top: "calc(env(safe-area-inset-top) + 0.75rem)", left: "1rem", right: "1rem" }}
      icons={{
        success: <CircleCheck className="size-5 text-primary" />,
        info: <Info className="size-5 text-muted-foreground" />,
        warning: <TriangleAlert className="size-5 text-warn-ink" />,
        error: <CircleX className="size-5 text-destructive" />,
        loading: <Spinner className="size-5" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-start gap-3 rounded-xl bg-surface-raised px-4 py-3 text-base text-foreground shadow-raised border border-border",
          title: "font-semibold leading-snug",
          description: "text-sm text-muted-foreground",
          actionButton: "ml-auto shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground",
          cancelButton: "ml-auto shrink-0 rounded-md px-3 py-1.5 text-sm font-semibold text-muted-foreground",
          icon: "mt-0.5",
        },
      }}
    />
  );
}
