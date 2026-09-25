import { BoardSkeleton, HeaderSkeleton, RowsSkeleton } from "@/components/page-skeletons";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Cargando el grupo">
      <HeaderSkeleton back />
      <BoardSkeleton rows={4} />
      <RowsSkeleton rows={3} />
    </div>
  );
}
