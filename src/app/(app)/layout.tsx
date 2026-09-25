import { ViewTransition } from "react";
import { BottomNav } from "@/components/ui/bottom-nav";

/**
 * Marco de todas las pantallas con sesión: el contenido (con su PageHeader fijo arriba) y la
 * barra de pestañas abajo, que no se vuelve a montar al navegar. El contenido deja lugar a la
 * barra y a la safe area; la barra es la única que paga la safe area de abajo.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-[calc(var(--nav-h)+env(safe-area-inset-bottom)+1.5rem)]">
        <ViewTransition default="page">{children}</ViewTransition>
      </main>
      <BottomNav />
    </>
  );
}
