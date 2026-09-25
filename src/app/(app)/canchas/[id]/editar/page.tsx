import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { todayInArgentina } from "@/lib/dates";
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
    <>
      <PageHeader title={`Editar ${course.name}`} back={{ fallback: `/canchas/${id}` }} />
      <CourseForm
        courseId={id}
        today={todayInArgentina()}
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
    </>
  );
}
