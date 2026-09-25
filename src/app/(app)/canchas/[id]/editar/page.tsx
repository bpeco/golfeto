import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import { getCourse } from "@/lib/db/courses";
import { CourseForm } from "../../course-form";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const course = await getCourse((await params).id);
  return { title: course ? `Editar ${course.name}` : "Editar cancha" };
}

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await getCourse(id);
  if (!course) notFound();
  const v = course.version;
  const holeNumberById = new Map((v?.holes ?? []).map((h) => [h.id, h.number]));

  return (
    <Shell title={`Editar ${course.name}`} back={`/canchas/${id}`}>
      <p className="mb-4 text-sm text-muted-foreground">
        Guardar crea una versión nueva vigente desde la fecha elegida. Las partidas ya jugadas siguen atadas a la versión de su fecha.
      </p>
      <CourseForm
        courseId={id}
        initial={{
          name: course.name,
          club: course.club,
          city: course.city,
          holesCount: v?.holesCount ?? 18,
          holes: v?.holes ?? [],
          tees: (v?.tees ?? []).map((t) => ({
            name: t.name,
            courseRating: t.courseRating,
            slope: t.slope,
            distances: Object.fromEntries(
              Object.entries(t.distances).map(([holeId, m]) => [holeNumberById.get(holeId) ?? 0, m]),
            ),
          })),
        }}
      />
    </Shell>
  );
}
