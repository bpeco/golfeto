"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatedBoardNumber, preloadNumberFlow } from "@/components/ui/animated-board-number";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { fmtDecimal, fmtToPar } from "@/lib/format";
import { minimumHolesToSign } from "@/lib/handicap/course";
import { haptics } from "@/lib/haptics";
import { signOutcomeText } from "@/lib/sign-outcome";
import type { SignEstimate } from "@/lib/sign-estimate";
import { signScorecard, type SignSummary } from "../actions";

/**
 * Firmar la propia tarjeta: primero el resumen (estimado en el cliente con el mismo motor WHS),
 * después el momento: el Hándicap Index rueda del valor anterior al nuevo.
 */
export function SignSheet({
  open,
  onOpenChange,
  roundId,
  cardId,
  estimate,
  toPar,
  onSigned,
  sign: signAction = signScorecard,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roundId: string;
  cardId: string;
  estimate: SignEstimate;
  toPar: number;
  onSigned?: (summary: SignSummary) => void;
  /** Para el playground: una acción de mentira. */
  sign?: typeof signScorecard;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SignSummary | null>(null);

  // El índice rueda al firmar: NumberFlow se baja apenas se abre la hoja.
  useEffect(() => {
    if (open) void preloadNumberFlow();
  }, [open]);

  function sign() {
    setError(null);
    start(async () => {
      const r = await signAction(roundId, cardId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      haptics.success();
      setResult(r.data);
      onSigned?.(r.data);
    });
  }

  function close(next: boolean) {
    onOpenChange(next);
    if (!next && result) router.refresh();
  }

  return (
    <Sheet
      open={open}
      onOpenChange={close}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) {
          setResult(null);
          setError(null);
        }
      }}
    >
      <SheetContent>
        {result ? (
          <SignedPanel summary={result} onDone={() => close(false)} />
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>Firmar tu tarjeta</SheetTitle>
              <SheetDescription>Firmada, cuenta para tu hándicap. Si hace falta, después la podés desfirmar.</SheetDescription>
            </SheetHeader>
            <dl className="divide-y divide-border border-y border-border">
              <Row label="Hoyos jugados" value={`${estimate.holesPlayed} de ${estimate.holesInRound}`} />
              <Row
                label="Gross"
                value={
                  <>
                    {estimate.gross}{" "}
                    <span className={toPar < 0 ? "text-score-under" : toPar > 0 ? "text-score-over" : "text-muted-foreground"}>({fmtToPar(toPar)})</span>
                  </>
                }
              />
              <Row label="Hándicap de cancha" value={estimate.courseHandicap} />
              <Row label="Gross ajustado" value={estimate.adjustedGross} />
              <Row label="Diferencial" value={fmtDecimal(estimate.differential)} />
            </dl>
            <p className="mt-2 text-sm text-muted-foreground">Estimado: al firmar se calcula con tu Hándicap Index de ese momento.</p>
            {estimate.pickedUp > 0 && (
              <Notice tone="warn" className="mt-4">
                {estimate.pickedUp === 1 ? "Tenés 1 Hoyo no terminado" : `Tenés ${estimate.pickedUp} Hoyos no terminados`}: para el hándicap cuentan como doble bogey neto.
              </Notice>
            )}
            {!estimate.acceptable && (
              <Notice tone="error" className="mt-4">
                Faltan hoyos: hay {estimate.holesPlayed} y se necesitan al menos {minimumHolesToSign(estimate.holesInRound)} para firmar.
              </Notice>
            )}
            {error && (
              <Notice tone="error" className="mt-4">
                {error}
              </Notice>
            )}
            <SheetFooter>
              <Button size="lg" pending={pending} pendingLabel="Firmando…" disabled={!estimate.acceptable} onClick={sign}>
                Firmar
              </Button>
              <Button size="lg" variant="ghost" onClick={() => close(false)} disabled={pending}>
                Todavía no
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <dt className="text-base text-muted-foreground">{label}</dt>
      <dd className="font-display text-xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function SignedPanel({ summary, onDone }: { summary: SignSummary; onDone: () => void }) {
  const hasIndex = summary.sourceAfter === "calculado" && summary.indexAfter != null;
  const from = summary.sourceBefore === "calculado" ? summary.indexBefore : undefined;
  return (
    <div className="pb-2">
      <SheetHeader>
        <SheetTitle>Firmada</SheetTitle>
        <SheetDescription>{signOutcomeText(summary)}</SheetDescription>
      </SheetHeader>
      {hasIndex && (
        <div className="border-y border-border py-4">
          <p className="text-sm text-muted-foreground">Hándicap Index</p>
          <AnimatedBoardNumber value={summary.indexAfter} from={from} kind="index" size="xl" />
        </div>
      )}
      <dl className="mt-4 grid grid-cols-3 text-center">
        <div>
          <dt className="text-sm text-muted-foreground">Gross</dt>
          <dd className="font-display text-2xl font-bold tabular-nums">{summary.gross}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Hándicap de cancha</dt>
          <dd className="font-display text-2xl font-bold tabular-nums">{summary.courseHandicap}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Diferencial</dt>
          <dd className="font-display text-2xl font-bold tabular-nums">{fmtDecimal(summary.differential)}</dd>
        </div>
      </dl>
      <SheetFooter>
        <Button size="lg" onClick={onDone}>
          Listo
        </Button>
      </SheetFooter>
    </div>
  );
}
