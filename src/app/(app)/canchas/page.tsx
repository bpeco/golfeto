import type { Metadata } from "next";
import Link from "next/link";
import { LandPlot, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { List, ListRow } from "@/components/ui/list";
import { PageHeader } from "@/components/ui/page-header";
import { TeeDot } from "@/components/ui/tee-chip";
import { listCourses } from "@/lib/db/courses";

export const metadata: Metadata = { title: "Canchas" };

export default async function CoursesPage() {
  const courses = await listCourses();
  return (
    <>
      <PageHeader
        title="Canchas"
        action={
          <Link href="/canchas/nueva" aria-label="Nueva cancha" className={buttonVariants({ variant: "ghost", size: "icon" })}>
            <Plus />
          </Link>
        }
      />
      {courses.length === 0 ? (
        <EmptyState
          icon={LandPlot}
          title="No hay canchas cargadas"
          body="Sacale una foto a la tarjeta del club y se completa sola, o cargala a mano."
          action={
            <Link href="/canchas/nueva" className={buttonVariants()}>
              Cargar la primera cancha
            </Link>
          }
        />
      ) : (
        <List>
          {courses.map((c) => (
            <ListRow
              key={c.id}
              href={`/canchas/${c.id}`}
              title={c.name}
              meta={
                <>
                  <span>{[c.club !== c.name ? c.club : null, c.city].filter(Boolean).join(", ") || "Sin club"}</span>
                  <span className="mt-1 flex items-center gap-2">
                    <span className="flex gap-1">
                      {c.tees.map((t) => (
                        <TeeDot key={t.id} name={t.name} className="size-2.5" />
                      ))}
                    </span>
                    <span>{c.version ? `${c.version.holesCount} hoyos` : "Sin versión"}</span>
                  </span>
                </>
              }
            />
          ))}
        </List>
      )}
    </>
  );
}
