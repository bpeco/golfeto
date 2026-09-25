import Link from "next/link";
import { Shell } from "@/components/shell";
import { Card, Empty, LinkButton } from "@/components/ui";
import { listCourses } from "@/lib/db/courses";

export default async function CoursesPage() {
  const courses = await listCourses();
  return (
    <Shell title="Canchas" action={<LinkButton href="/canchas/nueva">+ Nueva</LinkButton>}>
      {courses.length === 0 ? (
        <Empty>No hay canchas cargadas. Creá la primera con la tarjeta del club a mano.</Empty>
      ) : (
        <Card className="divide-y divide-border p-0">
          {courses.map((c) => (
            <Link key={c.id} href={`/canchas/${c.id}`} className="block px-4 py-3">
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-muted">
                {[c.club, c.city].filter(Boolean).join(" · ")}
                {c.version ? ` · ${c.version.holesCount} hoyos` : " · sin versión"}
                {c.tees.length ? ` · ${c.tees.map((t) => t.name).join(", ")}` : ""}
              </p>
            </Link>
          ))}
        </Card>
      )}
    </Shell>
  );
}
