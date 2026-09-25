import { HeaderSkeleton, RowsSkeleton } from "@/components/page-skeletons";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Cargando">
      <HeaderSkeleton />
      <RowsSkeleton rows={3} />
    </div>
  );
}
