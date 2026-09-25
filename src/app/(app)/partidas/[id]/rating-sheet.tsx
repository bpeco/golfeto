"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { parseDecimal } from "@/lib/format";
import { toast } from "@/lib/toast";
import { setRoundTeeRating } from "../actions";

/** CR y Slope del tee de la partida, para poder firmar. Se baja aparte, al abrirla. */
export default function RatingSheet({
  open,
  onOpenChange,
  roundId,
  teeName,
  holesCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roundId: string;
  teeName: string;
  holesCount: number;
}) {
  const [cr, setCr] = useState("");
  const [slope, setSlope] = useState("");
  const [error, setError] = useState<string>();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  function save() {
    setError(undefined);
    setFields({});
    start(async () => {
      const r = await setRoundTeeRating(roundId, { courseRating: parseDecimal(cr) ?? Number.NaN, slope: parseDecimal(slope) ?? Number.NaN });
      if (!r.ok) {
        setError(r.fields && Object.keys(r.fields).length ? undefined : r.error);
        setFields(r.fields ?? {});
        return;
      }
      toast.success(`Listo: las ${teeName} ya tienen rating`);
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
            <SheetTitle>CR y Slope de las {teeName}</SheetTitle>
            <SheetDescription>
              Están en la tarjeta del club{holesCount === 9 ? " (los de 9 hoyos)" : ""}. Se guardan en la cancha y valen para todas las partidas con este tee.
            </SheetDescription>
          </SheetHeader>
          {error && <Notice tone="error">{error}</Notice>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Course Rating" error={fields.courseRating}>
              <Input inputMode="decimal" placeholder={holesCount === 9 ? "35,2" : "70,3"} value={cr} onChange={(e) => setCr(e.target.value)} autoComplete="off" />
            </Field>
            <Field label="Slope" error={fields.slope}>
              <Input inputMode="numeric" placeholder="125" value={slope} onChange={(e) => setSlope(e.target.value)} autoComplete="off" />
            </Field>
          </div>
          <SheetFooter>
            <Button type="submit" size="lg" pending={pending} pendingLabel="Guardando…">
              Guardar
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
