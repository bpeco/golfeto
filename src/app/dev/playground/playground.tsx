"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "@/lib/toast";
import { Camera, ChevronLeft, ChevronRight, Copy, DoorOpen, Ellipsis, Flag, Share2, Trash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Board, BoardLabel } from "@/components/ui/board";
import { AnimatedBoardNumber } from "@/components/ui/animated-board-number";
import { BoardNumber } from "@/components/ui/board-number";
import { BottomNav } from "@/components/ui/bottom-nav";
import { Button } from "@/components/ui/button";
import { CellInput } from "@/components/ui/cell-input";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Initials } from "@/components/ui/initials";
import { Input } from "@/components/ui/input";
import { Leaderboard } from "@/components/ui/leaderboard";
import { List, ListRow } from "@/components/ui/list";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { RoundRow } from "@/components/ui/round-row";
import { SaveStatus } from "@/components/ui/save-status";
import { ScoreMark } from "@/components/ui/score-mark";
import { ScorecardGrid } from "@/components/ui/scorecard-grid";
import { Select } from "@/components/ui/select";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Stepper } from "@/components/ui/stepper";
import { StrokeDots } from "@/components/ui/stroke-dots";
import { TeeChip } from "@/components/ui/tee-chip";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { ThemeSwitch } from "@/components/theme-switch";
import { useConfirm } from "@/components/ui/use-confirm";
import { ActionMenu } from "@/components/ui/action-menu";
import { estimateSignature } from "@/lib/sign-estimate";
import PhotoSheet from "@/app/(app)/partidas/[id]/photo-sheet";
import { SignSheet } from "@/app/(app)/partidas/[id]/sign-sheet";
import { archivo, bigShoulders, publicSans } from "./fonts";
import { ME_ID, courseDetail, courseHandicaps, groups, players, recentRounds, round } from "./fixtures";
import { CourseFormScreen, GroupScreen, InicioVariant, NewRoundScreen, PartidaVariant } from "./variants";

type Variant = "A" | "B" | "C";
const VARIANTS: { key: Variant; name: string }[] = [
  { key: "A", name: "Tarjeta y pizarra (brief)" },
  { key: "B", name: "Más pizarra" },
  { key: "C", name: "Más papel" },
];

const SECTIONS = [
  ["tokens", "Tokens"],
  ["tipografia", "Tipografía"],
  ["botones", "Botones"],
  ["formularios", "Formularios"],
  ["avisos", "Avisos y estados"],
  ["notacion", "Notación"],
  ["stepper", "Stepper"],
  ["pizarra", "Pizarra"],
  ["listas", "Listas"],
  ["tarjeta", "Tarjeta"],
  ["overlays", "Hojas y menús"],
  ["cabecera", "Cabecera y barra"],
  ["pantalla-grupo", "Pantalla: Grupo"],
  ["pantalla-nueva-partida", "Pantalla: Nueva partida"],
  ["pantalla-cancha", "Pantalla: Cancha"],
  ["variante-partida", "Variante: Partida"],
  ["variante-inicio", "Variante: Inicio"],
] as const;

/** Catálogo de primitivas en todos sus estados + las variantes de la Puerta 1. */
export function Playground({ variant }: { variant: Variant }) {
  return (
    <main className="mx-auto w-full max-w-lg px-4 pt-4 pb-32">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Playground</h1>
        <ThemeSwitch className="w-auto" />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Componentes de Galf con datos de mentira. No toca Supabase.</p>
      <nav aria-label="Secciones del playground" className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm">
        {SECTIONS.map(([id, name]) => (
          <a key={id} href={`#${id}`} className="text-primary underline-offset-4 hover:underline">
            {name}
          </a>
        ))}
      </nav>

      <Shot id="tokens" title="Tokens">
        <Tokens />
      </Shot>
      <Shot id="tipografia" title="Tipografía">
        <Typography />
      </Shot>
      <Shot id="botones" title="Botones">
        <Buttons />
      </Shot>
      <Shot id="formularios" title="Formularios">
        <Forms />
      </Shot>
      <Shot id="avisos" title="Avisos y estados">
        <States />
      </Shot>
      <Shot id="notacion" title="Notación de tarjeta">
        <Notation />
      </Shot>
      <Shot id="stepper" title="Stepper">
        <StepperDemo />
      </Shot>
      <Shot id="pizarra" title="Pizarra">
        <BoardDemo />
      </Shot>
      <Shot id="listas" title="Listas">
        <Lists />
      </Shot>
      <Shot id="tarjeta" title="Tarjeta completa">
        <Grids />
      </Shot>
      <Shot id="overlays" title="Hojas, menús y toasts">
        <Overlays />
      </Shot>
      <Shot id="cabecera" title="Cabecera y barra de pestañas">
        <Chrome />
      </Shot>
      <Shot id="pantalla-grupo" title="Pantalla: Grupo">
        <GroupScreen />
      </Shot>
      <Shot id="pantalla-nueva-partida" title="Pantalla: Nueva partida">
        <NewRoundScreen />
      </Shot>
      <Shot id="pantalla-cancha" title="Pantalla: Cancha (formulario)">
        <CourseFormScreen />
      </Shot>
      <Shot id="variante-partida" title={`Partida — variante ${variant}`}>
        <PartidaVariant variant={variant} />
      </Shot>
      <Shot id="variante-inicio" title={`Inicio — variante ${variant}`}>
        <InicioVariant variant={variant} />
      </Shot>

      <VariantSwitcher current={variant} />
    </main>
  );
}

function Shot({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} data-shot={id} className="mt-10 scroll-mt-4 bg-background">
      <h2 className="mb-4 border-b-2 border-line-strong pb-1 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

// ——— Tokens ———

const SWATCHES = [
  ["background", "foreground"],
  ["card", "card-foreground"],
  ["primary", "primary-foreground"],
  ["secondary", "secondary-foreground"],
  ["muted", "muted-foreground"],
  ["accent", "accent-foreground"],
  ["destructive", "destructive-foreground"],
  ["board", "board-foreground"],
  ["warn", "warn-foreground"],
  ["surface-raised", "foreground"],
] as const;

function Tokens() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {SWATCHES.map(([bg, fg]) => (
          <Swatch key={bg} bg={bg} fg={fg} />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        {["score-under", "score-over", "line-strong", "border", "ring", "warn-ink"].map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <span className="size-4 rounded-sm" style={{ background: `var(--${t})` }} /> {t}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <span key={i} className="h-3 w-8 rounded-full" style={{ background: `var(--chart-${i})` }} title={`chart-${i}`} />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">Contraste calculado en el navegador sobre el color real renderizado. `pnpm contrast` es la verificación que manda.</p>
    </div>
  );
}

function Swatch({ bg, fg }: { bg: string; fg: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState<number | null>(null);
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    if (!ref.current) return;
    const style = getComputedStyle(ref.current);
    setRatio(contrast(style.color, style.backgroundColor));
  }, [resolvedTheme]);
  return (
    <div ref={ref} className="rounded-md border border-border p-3" style={{ background: `var(--${bg})`, color: `var(--${fg})` }}>
      <p className="text-sm font-semibold">{bg}</p>
      <p className="font-display text-2xl font-bold tabular-nums">{ratio ? ratio.toFixed(1).replace(".", ",") : "—"}</p>
    </div>
  );
}

function rgbOf(color: string): [number, number, number] {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}

function contrast(a: string, b: string) {
  const lum = (rgb: [number, number, number]) => {
    const [r, g, bb] = rgb.map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bb;
  };
  const [l1, l2] = [lum(rgbOf(a)), lum(rgbOf(b))].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// ——— Tipografía ———

const FACES = [
  { key: "A", name: "Sofia Sans + Sofia Sans Extra Condensed (elegida)", text: "font-sans", numerals: "font-display", style: undefined },
  { key: "B", name: "Archivo (eje de ancho a 75 %)", text: archivo.className, numerals: archivo.className, style: { fontStretch: "75%" } },
  { key: "C", name: "Public Sans + Big Shoulders", text: publicSans.className, numerals: bigShoulders.className, style: undefined },
] as const;

function Typography() {
  return (
    <div className="space-y-6">
      {FACES.map((f) => (
        <div key={f.key} className="border-b border-border pb-5">
          <p className="text-sm text-muted-foreground">
            {f.key}: {f.name}
          </p>
          <p className={cn("mt-2 text-xl font-semibold", f.text)}>Firmá tu tarjeta de Miraflores</p>
          <p className={cn("text-base", f.text)}>Te faltan 2 tarjetas firmadas para tener Hándicap Index. 1/7, 3/8, 6/8.</p>
          <p className={cn("text-xs", f.text)}>Caption a 12 px: 1 7 3 8 6 8 — Hcp 15, 162 m</p>
          <div className={cn("mt-3 flex items-end gap-4 font-bold tabular-nums", f.numerals)} style={f.style}>
            <span className="text-numeral-xl">21,3</span>
            <span className="text-numeral-lg">84</span>
            <span className="text-numeral">+12</span>
          </div>
          <TabularCheck className={f.numerals} style={f.style} />
        </div>
      ))}
      <div className="space-y-1 text-foreground">
        <p className="text-xl font-semibold">Título de página 20/600</p>
        <p className="text-base font-semibold">Encabezado de sección 16/600</p>
        <p className="text-base">Cuerpo 16/1,5: los golpes se guardan solos al tocar + o −.</p>
        <p className="text-sm text-muted-foreground">Pequeño 14: aprox. 12 sep, Blancas, 18 hoyos</p>
        <p className="text-xs text-muted-foreground">Caption 12: nada por debajo de este tamaño.</p>
      </div>
    </div>
  );
}

function TabularCheck({ className, style }: { className: string; style?: React.CSSProperties }) {
  const a = useRef<HTMLSpanElement>(null);
  const b = useRef<HTMLSpanElement>(null);
  const [result, setResult] = useState<string>("midiendo…");
  useEffect(() => {
    const measure = () => {
      if (!a.current || !b.current) return;
      const wa = a.current.getBoundingClientRect().width;
      const wb = b.current.getBoundingClientRect().width;
      setResult(Math.abs(wa - wb) < 0.5 ? `tabulares OK (${wa.toFixed(1)} px)` : `NO tabulares: ${wa.toFixed(1)} vs ${wb.toFixed(1)} px`);
    };
    document.fonts.ready.then(measure);
  }, []);
  return (
    <p className="mt-2 flex items-center gap-3 text-sm">
      <span className={cn("text-2xl font-bold tabular-nums", className)} style={style}>
        <span ref={a}>1111,1</span> / <span ref={b}>8888,8</span>
      </span>
      <span data-tabular-result className="text-muted-foreground">
        {result}
      </span>
    </p>
  );
}

// ——— Botones ———

function Buttons() {
  const [pending, setPending] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button>Crear partida</Button>
        <Button variant="secondary">Tarjeta completa</Button>
        <Button variant="ghost">No terminé el hoyo</Button>
        <Button variant="destructive">Dar de baja</Button>
        <Button variant="destructive-outline">Sacar</Button>
        <Button variant="link">Ver todas</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm">Chico 36</Button>
        <Button>Normal 44</Button>
        <Button size="lg">Grande 52</Button>
        <Button size="icon" variant="secondary" aria-label="Foto">
          <Camera />
        </Button>
        <Button size="icon" variant="ghost" aria-label="Más">
          <Ellipsis />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button pending={pending} onClick={() => setPending(true)}>
          Firmar
        </Button>
        <Button pending pendingLabel="Firmando…">
          Firmar
        </Button>
        <Button disabled>Deshabilitado</Button>
        <Button variant="secondary" onClick={() => setPending(false)}>
          Reiniciar
        </Button>
      </div>
    </div>
  );
}

// ——— Formularios ———

function Forms() {
  const [holes, setHoles] = useState<"completa" | "ida" | "vuelta">("completa");
  const [checked, setChecked] = useState(true);
  return (
    <div className="space-y-5">
      <Field label="Nombre del grupo" hint="Vos quedás como admin.">
        <Input placeholder="Los del sábado" />
      </Field>
      <Field label="Hándicap declarado" error="Va de +10 (plus) a 54">
        <Input inputMode="decimal" defaultValue="60" />
      </Field>
      <Field label="Cancha">
        <Select defaultValue="m">
          <option value="m">Miraflores — Miraflores CC</option>
          <option value="c">Los Cedros</option>
        </Select>
      </Field>
      <Field label="Notas" hint="Opcional">
        <Textarea placeholder="Viento del norte, greens rápidos" />
      </Field>
      <div className="grid gap-1.5">
        <span className="text-sm font-semibold">Hoyos</span>
        <Segmented
          label="Hoyos"
          value={holes}
          onValueChange={setHoles}
          options={[
            { value: "completa", label: "18 hoyos" },
            { value: "ida", label: "Ida" },
            { value: "vuelta", label: "Vuelta" },
          ]}
        />
      </div>
      <label className="flex min-h-tap items-center gap-3">
        <Checkbox checked={checked} onCheckedChange={setChecked} />
        <Initials name="Agus" size="sm" />
        <span className="text-base font-semibold">Agus</span>
      </label>
      <div className="grid grid-cols-5 gap-1.5">
        <CellInput aria-label="Hoyo 1" defaultValue="5" />
        <CellInput aria-label="Hoyo 2" defaultValue="4" uncertain />
        <CellInput aria-label="Hoyo 3" defaultValue="12" aria-invalid />
        <CellInput aria-label="Hoyo 4" placeholder="m" />
        <CellInput aria-label="Hoyo 5" defaultValue="3" disabled />
      </div>
    </div>
  );
}

// ——— Estados ———

function States() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge>18 hoyos</Badge>
        <Badge tone="signed">Firmada</Badge>
        <Badge tone="warn">Sin firmar</Badge>
        <Badge tone="under">−2</Badge>
        <Badge tone="over">+5</Badge>
        <Badge tone="guest">Invitado</Badge>
        <Badge tone="outline">histórica</Badge>
        <Badge tone="destructive">Dada de baja</Badge>
      </div>
      <Notice tone="info">Guardar crea una versión nueva vigente desde la fecha elegida.</Notice>
      <Notice tone="warn" title="Sin rating">
        Cargá CR y Slope de las Blancas para poder firmar.
      </Notice>
      <Notice tone="error">Sin conexión. Probá de nuevo.</Notice>
      <Notice tone="success">Cargamos 36 golpes en 2 tarjetas.</Notice>
      <EmptyState
        icon={Flag}
        title="Todavía no hay partidas"
        body="Creá la primera: elegís cancha, tee y quiénes juegan."
        action={<Button>Nueva partida</Button>}
      />
      <div className="flex flex-wrap items-center gap-5">
        <SaveStatus state="saving" />
        <SaveStatus state="saved" />
        <SaveStatus state="error" onRetry={() => toast("Reintentando")} />
        <Spinner />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  );
}

// ——— Notación ———

function Notation() {
  const cases: [number | null, boolean][] = [
    [2, false],
    [3, false],
    [4, false],
    [5, false],
    [6, false],
    [9, false],
    [null, true],
    [null, false],
  ];
  const [replay, setReplay] = useState(0);
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">En un par 4: eagle, birdie, par, bogey, doble bogey, +5, Hoyo no terminado, vacío.</p>
      {(["sm", "md"] as const).map((size) => (
        <div key={size} className="flex flex-wrap items-center gap-2">
          {cases.map(([s, p], i) => (
            <ScoreMark key={i} strokes={s} par={4} pickedUp={p} size={size} />
          ))}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-4" key={replay}>
        <ScoreMark strokes={3} par={4} size="lg" animate />
        <ScoreMark strokes={6} par={4} size="lg" animate />
        <Button variant="secondary" size="sm" onClick={() => setReplay(replay + 1)}>
          Repetir
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-5">
        <StrokeDots count={1} withText />
        <StrokeDots count={2} withText />
        <StrokeDots count={5} />
        <StrokeDots count={-1} withText />
      </div>
      <div className="flex flex-wrap gap-4">
        {["Blancas", "Azules", "Amarillas", "Rojas", "Negras", "Campeonato"].map((t) => (
          <TeeChip key={t} name={t} />
        ))}
      </div>
      <div className="flex items-center gap-2">
        {players.map((p) => (
          <Initials key={p.id} name={p.name} size="lg" />
        ))}
      </div>
    </div>
  );
}

function StepperDemo() {
  const [value, setValue] = useState<number | null>(null);
  const [value2, setValue2] = useState<number | null>(5);
  return (
    <div className="space-y-6">
      <Stepper size="lg" label="Golpes en el hoyo 7" value={value} emptyValue={3} onChange={setValue}>
        <ScoreMark strokes={value} par={3} size="lg" animate />
      </Stepper>
      <Stepper label="Golpes" value={value2} emptyValue={4} onChange={setValue2}>
        <ScoreMark strokes={value2} par={4} size="md" animate />
      </Stepper>
      <Stepper label="Deshabilitado" value={4} onChange={() => {}} disabled>
        <ScoreMark strokes={4} par={4} size="md" />
      </Stepper>
    </div>
  );
}

// ——— Pizarra ———

function BoardDemo() {
  const [v, setV] = useState(21.3);
  return (
    <div className="space-y-4">
      <Board>
        <BoardLabel>Hándicap Index</BoardLabel>
        <AnimatedBoardNumber value={v} kind="index" size="xl" />
        <BoardLabel className="mt-2">12 tarjetas firmadas</BoardLabel>
      </Board>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => setV(Math.round((v - 0.5) * 10) / 10)}>
          Bajar 0,5
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setV(Math.round((v + 0.4) * 10) / 10)}>
          Subir 0,4
        </Button>
      </div>
      <div className="flex items-end gap-5">
        <BoardNumber value={-3} kind="toPar" size="lg" />
        <BoardNumber value={0} kind="toPar" size="lg" />
        <BoardNumber value={12} kind="toPar" size="lg" />
        <BoardNumber value={-2} kind="index" size="lg" />
        <BoardNumber value={null} kind="index" size="lg" />
      </div>
      <Board>
        <Leaderboard
          rows={players.map((p) => {
            const h = p.handicap.history.filter((x) => x.handicapIndex != null);
            return {
              playerId: p.id,
              name: p.name,
              href: "#",
              value: p.handicap.effective,
              source: p.handicap.source,
              delta: h.length >= 2 ? h.at(-1)!.handicapIndex! - h.at(-2)!.handicapIndex! : null,
              isMe: p.id === ME_ID,
            };
          })}
        />
      </Board>
    </div>
  );
}

// ——— Listas ———

function Lists() {
  return (
    <div className="space-y-6">
      <List>
        {groups.map((g) => (
          <ListRow key={g.id} href="#" title={g.name} trailing={<span className="text-sm text-muted-foreground">{g.members} golfistas</span>} />
        ))}
        <ListRow leading={<Initials name="Agus" />} title="Agus" meta="8 tarjetas del historial" trailing={<Button size="sm" variant="secondary">Soy yo</Button>} />
      </List>
      <ul className="divide-y divide-border border-y border-border">
        {recentRounds.map((r) => (
          <RoundRow key={r.id} round={r} meId={ME_ID} />
        ))}
      </ul>
    </div>
  );
}

// ——— Tarjeta ———

function Grids() {
  return (
    <div className="space-y-8">
      <ScorecardGrid
        mode="scores"
        caption="Tarjeta completa de la partida"
        positions={round.positions}
        columns={round.scorecards.map((c) => ({
          id: c.id,
          name: c.playerName,
          scores: c.scores,
          locked: !!c.signedAt,
          legacyGross: c.isLegacy ? c.legacyGross : null,
          courseHandicap: courseHandicaps[c.id],
        }))}
        highlight={{ columnId: "card-bauti", position: 12 }}
        onCellTap={(id, p) => toast(`Abrir ${id} en el hoyo ${p}`)}
      />
      <ScorecardGrid
        mode="course"
        caption="Hoyos y distancias de Miraflores"
        positions={courseDetail.version!.holes.map((h, i) => ({ position: i + 1, hole: h }))}
        columns={courseDetail.version!.tees.map((t) => ({
          id: t.id,
          name: t.name,
          meters: Object.fromEntries(courseDetail.version!.holes.map((h) => [h.number, t.distances[h.id] ?? null])),
        }))}
      />
    </div>
  );
}

// Una tarjeta de papel dibujada (grilla) para la vista previa de la foto.
const CARD_PREVIEW =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 120"><rect width="90" height="120" fill="#f4f1e8"/>${Array.from({ length: 11 }, (_, i) => `<line x1="8" x2="82" y1="${14 + i * 9}" y2="${14 + i * 9}" stroke="#8a8f86" stroke-width="0.6"/>`).join("")}${Array.from({ length: 5 }, (_, i) => `<line y1="14" y2="104" x1="${8 + i * 18.5}" x2="${8 + i * 18.5}" stroke="#8a8f86" stroke-width="0.6"/>`).join("")}</svg>`,
  );

// ——— Overlays ———

function Overlays() {
  const confirm = useConfirm();
  const [signOpen, setSignOpen] = useState(false);
  const [photoStep, setPhotoStep] = useState<"idle" | "uploading" | "reading">("idle");
  const bauti = round.scorecards.find((c) => c.id === "card-bauti")!;
  const estimate = estimateSignature(round.positions, { ...bauti.scores, 13: { strokes: 5, pickedUp: false } }, { courseRating: 70.3, slope: 125, par: 71, holesInRound: 18 }, 21.3);
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        onClick={async () => {
          const r = await confirm({
            title: "¿Desfirmar tu tarjeta?",
            body: "Deja de contar para tu hándicap hasta que la vuelvas a firmar.",
            confirmLabel: "Desfirmar",
            tone: "destructive",
            reason: { label: "Motivo (opcional)", placeholder: "Me equivoqué en el hoyo 7" },
          });
          toast(r.ok ? `Confirmado${r.reason ? `: ${r.reason}` : ""}` : "Cancelado");
        }}
      >
        Confirmación
      </Button>
      <Button variant="secondary" onClick={() => setSignOpen(true)}>
        Firmar (de mentira)
      </Button>
      <Button variant="secondary" onClick={() => setPhotoStep("reading")}>
        Foto: leyendo
      </Button>
      <PhotoSheet
        step={photoStep === "idle" ? { kind: "idle" } : { kind: photoStep, preview: CARD_PREVIEW, photoId: "foto-1" }}
        players={[]}
        holesInRound={18}
        assign={[]}
        rows={[]}
        pending={false}
        onAssign={() => {}}
        onCell={() => {}}
        onRetry={() => {}}
        onPickPhoto={() => {}}
        onApply={() => {}}
        onDiscard={() => {}}
        onClose={() => setPhotoStep("idle")}
      />
      <SignSheet
        open={signOpen}
        onOpenChange={setSignOpen}
        roundId={round.id}
        cardId="card-bauti"
        estimate={estimate}
        toPar={9}
        sign={async () => ({
          ok: true,
          data: {
            gross: estimate.gross,
            adjustedGross: estimate.adjustedGross,
            courseHandicap: estimate.courseHandicap,
            differential: estimate.differential,
            indexBefore: 21.3,
            sourceBefore: "calculado",
            indexAfter: 20.8,
            sourceAfter: "calculado",
            signedCount: 13,
          },
        })}
      />
      <Sheet>
        <SheetTrigger render={<Button variant="secondary" />}>Abrir hoja</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>¿Dar de baja la partida?</SheetTitle>
            <SheetDescription>Solo se puede si nadie firmó. Queda dada de baja, no se borra.</SheetDescription>
          </SheetHeader>
          <Field label="Motivo (opcional)">
            <Input />
          </Field>
          <SheetFooter>
            <Button variant="destructive" size="lg">
              Dar de baja
            </Button>
            <SheetClose render={<Button variant="ghost" size="lg" />}>Cancelar</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="secondary" size="icon" aria-label="Más acciones" />}>
          <Ellipsis />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => toast.success("Link copiado")}>
            <Copy /> Copiar link
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Share2 /> Compartir
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            <DoorOpen /> Salir del grupo
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive">
            <Trash /> Dar de baja
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ActionMenu
        label="Más acciones (hoja)"
        actions={[
          { label: "Copiar link", icon: <Copy />, onSelect: () => toast.success("Link copiado") },
          { label: "Compartir", icon: <Share2 />, onSelect: () => toast("Compartir") },
          { label: "Salir del grupo", icon: <DoorOpen />, onSelect: () => toast("Salir"), destructive: true },
        ]}
      />
      <Button variant="secondary" onClick={() => toast.success("Firmada", { description: "Tu Hándicap Index pasa de 21,3 a 20,8" })}>
        Toast éxito
      </Button>
      <Button variant="secondary" onClick={() => toast.error("No se guardó el hoyo 7", { description: "Sin conexión. Probá de nuevo." })}>
        Toast error
      </Button>
    </div>
  );
}

// ——— Cabecera y barra ———

function Chrome() {
  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-md border border-border px-4">
        <PageHeader
          className="static mb-0 border-b-0"
          title="Miraflores"
          back={{ fallback: "/partidas" }}
          action={
            <Button variant="ghost" size="icon" aria-label="Más">
              <Ellipsis />
            </Button>
          }
          meta={
            <>
              <span>12 sep</span>
              <TeeChip name="Blancas" size="sm" className="text-foreground" />
              <span>18 hoyos</span>
            </>
          }
        />
      </div>
      <div className="relative h-24 overflow-hidden rounded-md border border-border [transform:translateZ(0)]">
        <BottomNav />
      </div>
    </div>
  );
}

// ——— Switcher de variantes (skill prototype) ———

function VariantSwitcher({ current }: { current: Variant }) {
  const router = useRouter();
  const pathname = usePathname();
  const index = VARIANTS.findIndex((v) => v.key === current);
  const go = (delta: number) => {
    const next = VARIANTS[(index + delta + VARIANTS.length) % VARIANTS.length];
    router.replace(`${pathname}?variant=${next.key}${window.location.hash}`, { scroll: false });
  };
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center gap-1 rounded-full bg-foreground p-1 text-background shadow-raised">
        <button type="button" aria-label="Variante anterior" onClick={() => go(-1)} className="flex size-tap items-center justify-center rounded-full">
          <ChevronLeft className="size-5" />
        </button>
        <span className="px-2 text-sm font-semibold whitespace-nowrap">
          {current} ({VARIANTS[index].name})
        </span>
        <button type="button" aria-label="Variante siguiente" onClick={() => go(1)} className="flex size-tap items-center justify-center rounded-full">
          <ChevronRight className="size-5" />
        </button>
      </div>
    </div>
  );
}
