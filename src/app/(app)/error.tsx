"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";

/** Error inesperado en una pantalla: se dice, se puede reintentar y siempre hay salida. */
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="pt-[calc(env(safe-area-inset-top)+1.5rem)]">
      <h1 className="text-xl font-semibold">Algo salió mal</h1>
      <Notice tone="error" className="mt-4">
        No pudimos mostrar esta pantalla. Si no tenés señal, probá de nuevo en un rato.
        {error.digest && <span className="mt-1 block text-sm text-muted-foreground">Código: {error.digest}</span>}
      </Notice>
      <div className="mt-6 grid gap-2">
        <Button size="lg" onClick={() => retry()}>
          Reintentar
        </Button>
        <Link href="/" className={buttonVariants({ variant: "ghost", size: "lg" })}>
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
