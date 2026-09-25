import { Skeleton } from "@/components/ui/skeleton";

/** Piezas de carga con la misma geometría que las pantallas (sin saltos al llegar el contenido). */

export function HeaderSkeleton({ back = false, meta = false }: { back?: boolean; meta?: boolean }) {
  return (
    <div className="-mx-4 mb-4 border-b border-border px-4 pt-[env(safe-area-inset-top)]">
      <div className="flex min-h-14 items-center gap-3">
        {back && <Skeleton className="size-7 rounded-full" />}
        <Skeleton className="h-6 w-40" />
      </div>
      {meta && <Skeleton className="mb-3 h-4 w-56" />}
    </div>
  );
}

export function RowsSkeleton({ rows = 3, title = true }: { rows?: number; title?: boolean }) {
  return (
    <div className="mt-8 first:mt-0">
      {title && <Skeleton className="mb-3 h-5 w-32" />}
      <div className="divide-y divide-border border-y border-border">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex min-h-14 items-center gap-3 py-2.5">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3.5 w-3/5" />
            </div>
            <Skeleton className="h-6 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BoardSkeleton({ rows = 0 }: { rows?: number }) {
  return (
    <div className="rounded-xl bg-muted p-4">
      <Skeleton className="h-4 w-28 bg-border" />
      {rows === 0 ? (
        <Skeleton className="mt-3 h-16 w-36 bg-border" />
      ) : (
        <div className="mt-2 space-y-3">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-7 rounded-full bg-border" />
              <Skeleton className="h-4 flex-1 bg-border" />
              <Skeleton className="h-9 w-14 bg-border" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Partida: selector de tarjeta, hoyo, numeral y stepper. */
export function FocusSkeleton() {
  return (
    <div>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-tap w-24" />
        ))}
      </div>
      <Skeleton className="mt-5 h-10 w-32" />
      <Skeleton className="mt-2 h-5 w-48" />
      <div className="mt-10 flex items-center justify-between">
        <Skeleton className="size-thumb rounded-full" />
        <Skeleton className="size-32 rounded-full" />
        <Skeleton className="size-thumb rounded-full" />
      </div>
      <Skeleton className="mt-10 h-24 w-full" />
    </div>
  );
}
