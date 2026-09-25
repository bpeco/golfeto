import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/** Rutas que no existen (fuera del marco con pestañas). */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6">
      <p className="font-display text-numeral-xl font-bold text-muted-foreground">404</p>
      <h1 className="mt-2 text-xl font-semibold">No encontramos esto.</h1>
      <p className="mt-1 text-base text-muted-foreground">Puede haber sido dado de baja, o el link está mal.</p>
      <Link href="/" className={buttonVariants({ size: "lg", className: "mt-6" })}>
        Ir al inicio
      </Link>
    </main>
  );
}
