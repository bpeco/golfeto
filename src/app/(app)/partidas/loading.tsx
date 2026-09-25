import { HeaderSkeleton, RowsSkeleton } from "@/components/page-skeletons";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Cargando partidas">
      <HeaderSkeleton />
      <RowsSkeleton rows={6} />
    </div>
  );
}
