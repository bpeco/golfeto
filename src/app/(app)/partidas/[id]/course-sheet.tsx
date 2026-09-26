"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TeeDot } from "@/components/ui/tee-chip";
import { Segmented } from "@/components/ui/toggle-group";
import type { CourseSummary } from "@/lib/db/courses";
import type { HolesPlayed } from "@/lib/round-model";
import { toast } from "@/lib/toast";
import { changeRoundCourse } from "../actions";

export type CourseSheetProps = {
  roundId: string;
  /** Canchas con la versión vigente en la fecha de la partida. */
  courses: CourseSummary[];
  current: { courseId: string; teeId: string; holesPlayed: HolesPlayed };
  /** Hoyos jugados (posiciones): se conservan en la cancha nueva. */
  holes: number;
  /** Quiénes ya firmaron: con alguna firma no se puede cambiar la cancha. */
  signedNames: string[];
};

/** Cambiar la cancha y el tee de una partida cargada en la equivocada. Se baja aparte, al abrirla. */
export default function CourseSheet({
  open,
  onOpenChange,
  roundId,
  courses,
  current,
  holes,
  signedNames,
}: CourseSheetProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const usable = courses.filter((c) => c.version && c.tees.length);
  const [courseId, setCourseId] = useState(usable.some((c) => c.id === current.courseId) ? current.courseId : (usable[0]?.id ?? ""));
  const course = usable.find((c) => c.id === courseId);
  const [teeId, setTeeId] = useState(course?.tees.some((t) => t.id === current.teeId) ? current.teeId : (course?.tees[0]?.id ?? ""));
  const [nine, setNine] = useState<"ida" | "vuelta">(current.holesPlayed === "vuelta" ? "vuelta" : "ida");
  const [error, setError] = useState<string>();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const tee = course?.tees.find((t) => t.id === teeId);
  const holesCount = course?.version?.holesCount;
  const locked = signedNames.length > 0;
  const unchanged = courseId === current.courseId && teeId === current.teeId && (holesCount !== 18 || holes !== 9 || nine === current.holesPlayed);

  function pickCourse(id: string) {
    setCourseId(id);
    const c = usable.find((x) => x.id === id);
    setTeeId(c?.tees[0]?.id ?? "");
  }

  function save() {
    if (!course?.version || !teeId) return;
    setError(undefined);
    setFields({});
    start(async () => {
      const r = await changeRoundCourse(roundId, { courseVersionId: course.version!.id, teeSetId: teeId, nine: holesCount === 18 && holes === 9 ? nine : undefined });
      if (!r.ok) {
        setError(r.fields && Object.keys(r.fields).length ? undefined : r.error);
        setFields(r.fields ?? {});
        return;
      }
      toast.success(`Listo: la partida ahora es en ${r.data.courseName}`);
      onOpenChange(false);
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <SheetHeader>
            <SheetTitle>Cambiar cancha</SheetTitle>
            <SheetDescription>Para una partida cargada en la cancha o el tee equivocados. Los golpes cargados pasan a los mismos hoyos de la cancha nueva.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-4">
            {locked && (
              <Notice tone="warn">
                {signedNames.length === 1 ? `${signedNames[0]} ya firmó su tarjeta.` : `Ya firmaron ${signedNames.join(" y ")}.`} Para cambiar la cancha, primero hay que desfirmar.
              </Notice>
            )}
            {error && <Notice tone="error">{error}</Notice>}
            <Field label="Cancha" error={fields.courseVersionId}>
              <Select value={courseId} disabled={locked} onChange={(e) => pickCourse(e.target.value)}>
                {usable.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.club && c.club !== c.name ? ` — ${c.club}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            {course && (
              <div className="grid gap-1.5">
                <span className="text-sm font-semibold">Tee</span>
                <Segmented
                  label="Tee"
                  value={teeId}
                  onValueChange={setTeeId}
                  disabled={locked}
                  options={course.tees.map((t) => ({
                    value: t.id,
                    label: (
                      <span className="inline-flex items-center gap-1.5">
                        <TeeDot name={t.name} className="size-2.5" />
                        {t.name}
                      </span>
                    ),
                  }))}
                />
                {fields.teeSetId && <p className="text-sm text-destructive">{fields.teeSetId}</p>}
                {tee && (tee.courseRating == null || tee.slope == null) && (
                  <p className="text-sm text-muted-foreground">Las {tee.name} no tienen CR y Slope: para firmar hay que cargarlos.</p>
                )}
              </div>
            )}
            {holesCount === 18 && holes === 9 && (
              <div className="grid gap-1.5">
                <span className="text-sm font-semibold">Qué nueve se jugó</span>
                <Segmented
                  label="Qué nueve se jugó"
                  value={nine}
                  onValueChange={setNine}
                  disabled={locked}
                  options={[
                    { value: "ida", label: "Ida (1 a 9)" },
                    { value: "vuelta", label: "Vuelta (10 a 18)" },
                  ]}
                />
              </div>
            )}
            {holesCount === 9 && holes === 18 && <p className="text-sm text-muted-foreground">Es una cancha de 9: los 18 hoyos quedan como dos vueltas.</p>}
          </div>
          <SheetFooter>
            <Button type="submit" size="lg" pending={pending} pendingLabel="Cambiando…" disabled={locked || !course || !teeId || unchanged}>
              Cambiar cancha
            </Button>
            <Button type="button" size="lg" variant="ghost" disabled={pending} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
