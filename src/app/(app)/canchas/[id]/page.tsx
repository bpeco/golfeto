import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PenLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { List, ListRow } from "@/components/ui/list";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { ScorecardGrid } from "@/components/ui/scorecard-grid";
import { Section } from "@/components/ui/section";
import { TeeChip } from "@/components/ui/tee-chip";
import { fmtCount, fmtDecimal, formatDate } from "@/lib/format";
import { getCourse } from "@/lib/db/courses";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const course = await getCourse((await params).id);
  return { title: course?.name ?? "Cancha" };
}

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await getCourse(id);
  if (!course) notFound();
  const v = course.version;
  const place = [course.club !== course.name ? course.club : null, course.city].filter(Boolean).join(", ");

  return (
    <>
      <PageHeader
        title={course.name}
        back={{ fallback: "/canchas" }}
        action={
          <Link href={`/canchas/${id}/editar`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <PenLine /> Editar
          </Link>
        }
        meta={place ? <span>{place}</span> : undefined}
      />
      {!v ? (
        <Notice tone="warn" title="Sin versión cargada">
          Editá la cancha para cargar hoyos y tees.
        </Notice>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Badge>{v.holesCount} hoyos</Badge>
            <Badge>par {v.holes.reduce((s, h) => s + h.par, 0)}</Badge>
            <Badge tone="outline">vigente desde {formatDate(v.validFrom)}</Badge>
            {course.versionCount > 1 && <Badge tone="outline">{fmtCount(course.versionCount, "versión", "versiones")}</Badge>}
          </div>

          <Section title="Tees" className="mt-6">
            <List>
              {v.tees.map((t) => {
                const meters = Object.values(t.distances).reduce((s, m) => s + m, 0);
                return (
                  <ListRow
                    key={t.id}
                    title={<TeeChip name={t.name} />}
                    meta={meters ? `${meters.toLocaleString("es-AR")} m` : "Sin distancias"}
                    trailing={
                      t.courseRating != null && t.slope != null ? (
                        <span className="text-base">
                          CR <strong className="font-display text-lg tabular-nums">{fmtDecimal(t.courseRating)}</strong> / Slope{" "}
                          <strong className="font-display text-lg tabular-nums">{t.slope}</strong>
                        </span>
                      ) : (
                        <Badge tone="warn">Sin rating</Badge>
                      )
                    }
                  />
                );
              })}
            </List>
          </Section>

          <Section title="Hoyos">
            <ScorecardGrid
              mode="course"
              caption={`Hoyos de ${course.name}: par, hándicap de hoyo y distancias por tee`}
              positions={v.holes.map((h, i) => ({ position: i + 1, hole: h }))}
              columns={v.tees.map((t) => ({
                id: t.id,
                name: t.name,
                meters: Object.fromEntries(v.holes.map((h) => [h.number, t.distances[h.id] ?? null])),
              }))}
            />
          </Section>

          <Notice tone="info" className="mt-6">
            Editar crea una versión nueva vigente desde la fecha que elijas. Las partidas ya jugadas siguen atadas a la versión de su fecha.
          </Notice>
        </>
      )}
    </>
  );
}
