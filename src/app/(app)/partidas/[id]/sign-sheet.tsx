"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatedBoardNumber, preloadNumberFlow } from "@/components/ui/animated-board-number";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Notice } from "@/components/ui/notice";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { fmtDecimal, fmtToPar } from "@/lib/format";
import { minimumHolesToSign } from "@/lib/handicap/course";
import { haptics } from "@/lib/haptics";
import { signOutcomeText } from "@/lib/sign-outcome";
import type { SignEstimate } from "@/lib/sign-estimate";
import { cn } from "@/lib/utils";
import { signScorecards, type SignManySummary, type SignSummary } from "../actions";

/** Una tarjeta que quien mira puede firmar: la suya o la de otro golfista de la partida. */
export type SignableCard = {
  id: string;
  name: string;
  isOwner: boolean;
  estimate: SignEstimate;
  toPar: number;
  /** Tiene golpes sin guardar: no se firma hasta que se guarden. */
  saving: boolean;
};

const names = new Intl.ListFormat("es", { type: "conjunction" });

/**
 * Firmar: primero el resumen (estimado en el cliente con el mismo motor WHS), después el momento:
 * el Hándicap Index rueda del valor anterior al nuevo. Si hay más tarjetas sin firmar en la partida,
 * se eligen cuáles firmar de una vez; las de los demás quedan a nombre de quien firma.
 */
export function SignSheet({
  open,
  onOpenChange,
  roundId,
  cards,
  onSigned,
  sign: signAction = signScorecards,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roundId: string;
  /** La propia primero. */
  cards: SignableCard[];
  onSigned?: (summary: SignManySummary) => void;
  /** Para el playground: una acción de mentira. */
  sign?: typeof signScorecards;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SignManySummary | null>(null);
  // Las que se destildaron; el resto de las que se pueden firmar va tildado.
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(new Set());

  // El índice rueda al firmar: NumberFlow se baja apenas se abre la hoja.
  useEffect(() => {
    if (open) void preloadNumberFlow();
  }, [open]);

  const ready = (c: SignableCard) => c.estimate.acceptable && !c.saving;
  const selected = cards.filter((c) => ready(c) && !skipped.has(c.id));

  function sign() {
    setError(null);
    start(async () => {
      const r = await signAction(roundId, selected.map((c) => c.id));
      if (!r.ok) {
        setError(r.error);
        return;
      }
      haptics.success();
      setResult(r.data);
      onSigned?.(r.data);
    });
  }

  function toggle(id: string, on: boolean) {
    const next = new Set(skipped);
    if (on) next.delete(id);
    else next.add(id);
    setSkipped(next);
  }

  function close(next: boolean) {
    onOpenChange(next);
    if (!next && result) router.refresh();
  }

  const single = cards.length === 1 ? cards[0] : null;

  return (
    <Sheet
      open={open}
      onOpenChange={close}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) {
          setResult(null);
          setError(null);
          setSkipped(new Set());
        }
      }}
    >
      <SheetContent>
        {result ? (
          result.own ? (
            <SignedPanel summary={result.own} others={result.others} onDone={() => close(false)} />
          ) : (
            <OthersSignedPanel others={result.others} onDone={() => close(false)} />
          )
        ) : (
          <>
            {single ? <SingleCard card={single} /> : <ManyCards cards={cards} isSelected={(c) => selected.includes(c)} ready={ready} onToggle={toggle} />}
            {error && (
              <Notice tone="error" className="mt-4">
                {error}
              </Notice>
            )}
            <SheetFooter>
              <Button size="lg" pending={pending} pendingLabel="Firmando…" disabled={selected.length === 0} onClick={sign}>
                {selected.length > 1 ? `Firmar ${selected.length} tarjetas` : "Firmar"}
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

function SingleCard({ card }: { card: SignableCard }) {
  const { estimate, toPar } = card;
  return (
    <>
      <SheetHeader>
        <SheetTitle>{card.isOwner ? "Firmar tu tarjeta" : `Firmar la tarjeta de ${card.name}`}</SheetTitle>
        <SheetDescription>
          {card.isOwner
            ? "Firmada, cuenta para tu hándicap. Si hace falta, después la podés desfirmar."
            : `Queda firmada a tu nombre y cuenta para el hándicap de ${card.name}, que la puede desfirmar si hace falta.`}
        </SheetDescription>
      </SheetHeader>
      <dl className="divide-y divide-border border-y border-border">
        <Row label="Hoyos jugados" value={`${estimate.holesPlayed} de ${estimate.holesInRound}`} />
        <Row
          label="Gross"
          value={
            <>
              {estimate.gross} <span className={toParTone(toPar)}>({fmtToPar(toPar)})</span>
            </>
          }
        />
        <Row label="Hándicap de cancha" value={estimate.courseHandicap} />
        <Row label="Gross ajustado" value={estimate.adjustedGross} />
        <Row label="Diferencial" value={fmtDecimal(estimate.differential)} />
      </dl>
      <p className="mt-2 text-sm text-muted-foreground">
        {card.isOwner ? "Estimado: al firmar se calcula con tu Hándicap Index de ese momento." : `Estimado: al firmar se calcula con el Hándicap Index de ${card.name} en ese momento.`}
      </p>
      {estimate.pickedUp > 0 && (
        <Notice tone="warn" className="mt-4">
          {estimate.pickedUp === 1 ? "Hay 1 Hoyo no terminado" : `Hay ${estimate.pickedUp} Hoyos no terminados`}: para el hándicap cuentan como doble bogey neto.
        </Notice>
      )}
      {!estimate.acceptable && (
        <Notice tone="error" className="mt-4">
          Faltan hoyos: hay {estimate.holesPlayed} y se necesitan al menos {minimumHolesToSign(estimate.holesInRound)} para firmar.
        </Notice>
      )}
    </>
  );
}

function ManyCards({
  cards,
  isSelected,
  ready,
  onToggle,
}: {
  cards: SignableCard[];
  isSelected: (c: SignableCard) => boolean;
  ready: (c: SignableCard) => boolean;
  onToggle: (id: string, on: boolean) => void;
}) {
  return (
    <>
      <SheetHeader>
        <SheetTitle>Firmar tarjetas</SheetTitle>
        <SheetDescription>Firmadas, cuentan para el hándicap de cada uno. Las de los demás quedan a tu nombre y cada uno puede desfirmar la suya.</SheetDescription>
      </SheetHeader>
      <table className="w-full border-y border-border">
        <thead>
          <tr className="text-sm text-muted-foreground">
            <th scope="col" className="w-10">
              <span className="sr-only">Firmar</span>
            </th>
            <th scope="col" className="py-2 text-left font-normal">
              Tarjeta
            </th>
            <th scope="col" className="py-2 text-right font-normal">
              Gross
            </th>
            <th scope="col" className="py-2 pl-4 text-right font-normal">
              Diferencial
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border border-t border-border">
          {cards.map((c) => {
            const name = c.isOwner ? "Vos" : c.name;
            const note = !c.estimate.acceptable
              ? `Faltan hoyos: hay ${c.estimate.holesPlayed} de ${minimumHolesToSign(c.estimate.holesInRound)}`
              : c.saving
                ? "Guardando los últimos golpes…"
                : c.estimate.pickedUp > 0
                  ? c.estimate.pickedUp === 1
                    ? "1 Hoyo no terminado"
                    : `${c.estimate.pickedUp} Hoyos no terminados`
                  : null;
            return (
              <tr key={c.id} className={cn(!ready(c) && "text-muted-foreground")}>
                <td className="py-3 align-middle">
                  <Checkbox
                    aria-label={c.isOwner ? "Firmar tu tarjeta" : `Firmar la tarjeta de ${c.name}`}
                    checked={isSelected(c)}
                    disabled={!ready(c)}
                    onCheckedChange={(on) => onToggle(c.id, on)}
                  />
                </td>
                <td className="py-3 align-middle">
                  <span className="text-base font-semibold">{name}</span>
                  {note && <span className={cn("block text-sm", c.estimate.acceptable ? "text-warn-ink" : "text-destructive")}>{note}</span>}
                </td>
                <td className="py-3 text-right align-middle font-display text-xl font-bold whitespace-nowrap tabular-nums">
                  {c.estimate.gross} <span className={cn("text-sm", toParTone(c.toPar))}>({fmtToPar(c.toPar)})</span>
                </td>
                <td className="py-3 pl-4 text-right align-middle font-display text-xl font-bold tabular-nums">{fmtDecimal(c.estimate.differential)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-sm text-muted-foreground">Estimado: al firmar se calcula con el Hándicap Index de cada uno en ese momento.</p>
    </>
  );
}

function toParTone(toPar: number) {
  return toPar < 0 ? "text-score-under" : toPar > 0 ? "text-score-over" : "text-muted-foreground";
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <dt className="text-base text-muted-foreground">{label}</dt>
      <dd className="font-display text-xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function SignedPanel({ summary, others, onDone }: { summary: SignSummary; others: SignManySummary["others"]; onDone: () => void }) {
  const hasIndex = summary.sourceAfter === "calculado" && summary.indexAfter != null;
  const from = summary.sourceBefore === "calculado" ? summary.indexBefore : undefined;
  return (
    <div className="pb-2">
      <SheetHeader>
        <SheetTitle>Firmada</SheetTitle>
        <SheetDescription>
          {signOutcomeText(summary)}
          {others.length > 0 && ` También firmaste ${others.length === 1 ? "la tarjeta" : "las tarjetas"} de ${names.format(others.map((o) => o.name))}.`}
        </SheetDescription>
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

function OthersSignedPanel({ others, onDone }: { others: SignManySummary["others"]; onDone: () => void }) {
  return (
    <div className="pb-2">
      <SheetHeader>
        <SheetTitle>{others.length === 1 ? "Firmada" : "Firmadas"}</SheetTitle>
        <SheetDescription>
          {others.length === 1
            ? `Firmaste la tarjeta de ${others[0].name}. Queda a tu nombre y ${others[0].name} la puede desfirmar.`
            : `Firmaste las tarjetas de ${names.format(others.map((o) => o.name))}. Quedan a tu nombre y cada uno puede desfirmar la suya.`}
        </SheetDescription>
      </SheetHeader>
      <dl className="divide-y divide-border border-y border-border">
        {others.map((o) => (
          <Row key={o.name} label={`Diferencial de ${o.name}`} value={fmtDecimal(o.differential)} />
        ))}
      </dl>
      <SheetFooter>
        <Button size="lg" onClick={onDone}>
          Listo
        </Button>
      </SheetFooter>
    </div>
  );
}
