import { BoardSkeleton, HeaderSkeleton, RowsSkeleton } from "@/components/page-skeletons";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Cargando el golfista">
      <HeaderSkeleton back />
      <BoardSkeleton />
      <RowsSkeleton rows={4} />
    </div>
  );
}
