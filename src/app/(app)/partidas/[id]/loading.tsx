import { FocusSkeleton, HeaderSkeleton } from "@/components/page-skeletons";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Cargando la partida">
      <HeaderSkeleton back meta />
      <FocusSkeleton />
    </div>
  );
}
