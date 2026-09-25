import Link from "next/link";
import type { ReactNode } from "react";

/** Marco de página mobile-first: cabecera con título y acción, contenido, barra inferior. */
export function Shell({
  title,
  back,
  action,
  children,
}: {
  title: string;
  back?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        {back && (
          <Link href={back} aria-label="Volver" className="-ml-1 rounded-full p-1 text-muted-foreground">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
        )}
        <h1 className="flex-1 truncate text-lg font-bold">{title}</h1>
        {action}
      </header>
      <main className="flex-1 px-4 py-4 pb-24">{children}</main>
      <Nav />
    </div>
  );
}

function Nav() {
  const items = [
    { href: "/", label: "Inicio", icon: "M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" },
    { href: "/partidas", label: "Partidas", icon: "M4 4h16v16H4zM4 9h16M9 4v16" },
    { href: "/canchas", label: "Canchas", icon: "M6 21V4l10 3-10 3M6 21h6" },
    { href: "/perfil", label: "Perfil", icon: "M20 21a8 8 0 10-16 0M12 13a4 4 0 100-8 4 4 0 000 8z" },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 backdrop-blur">
      <ul className="mx-auto flex max-w-lg justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map((it) => (
          <li key={it.href}>
            <Link href={it.href} className="flex flex-col items-center gap-0.5 px-3 py-2 text-xs text-muted-foreground">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d={it.icon} />
              </svg>
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
