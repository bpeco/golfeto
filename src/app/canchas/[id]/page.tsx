import { notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card, LinkButton, formatDate } from "@/components/ui";
import { getCourse } from "@/lib/db/courses";

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await getCourse(id);
  if (!course) notFound();
  const v = course.version;

  return (
    <Shell title={course.name} back="/canchas" action={<LinkButton href={`/canchas/${id}/editar`} variant="secondary">Editar</LinkButton>}>
      <p className="text-sm text-muted">{[course.club, course.city].filter(Boolean).join(" · ")}</p>
      {!v ? (
        <p className="mt-4 text-sm">Sin versión cargada.</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted">
            {v.holesCount} hoyos · par {v.holes.reduce((s, h) => s + h.par, 0)} · vigente desde {formatDate(v.validFrom)}
            {course.versionCount > 1 ? ` · ${course.versionCount} versiones` : ""}
          </p>

          <Card className="mt-4 divide-y divide-border p-0">
            {v.tees.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="font-medium">{t.name}</span>
                <span className="text-muted">
                  {t.courseRating != null && t.slope != null ? `CR ${t.courseRating.toFixed(1)} · Slope ${t.slope}` : "sin rating"}
                  {Object.keys(t.distances).length ? ` · ${Object.values(t.distances).reduce((s, m) => s + m, 0)} m` : ""}
                </span>
              </div>
            ))}
          </Card>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-background text-xs text-muted">
                <tr>
                  <th className="px-2 py-2 text-left">Hoyo</th>
                  <th className="px-2 py-2">Par</th>
                  <th className="px-2 py-2">Hcp</th>
                  {v.tees.map((t) => <th key={t.id} className="px-2 py-2">{t.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {v.holes.map((h) => (
                  <tr key={h.id} className="border-t border-border text-center">
                    <td className="px-2 py-1 text-left font-medium">{h.number}</td>
                    <td className="px-2 py-1">{h.par}</td>
                    <td className="px-2 py-1">{h.strokeIndex ?? "—"}</td>
                    {v.tees.map((t) => <td key={t.id} className="px-2 py-1 text-muted">{t.distances[h.id] ?? "—"}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Shell>
  );
}
