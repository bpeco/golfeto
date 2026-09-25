import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { BrandMark } from "@/components/brand-mark";
import { Notice } from "@/components/ui/notice";
import { GoogleButton } from "./google-button";

export const metadata: Metadata = { title: "Entrar" };

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/**
 * La entrada: se dibujan las reglas de una tarjeta, el círculo de lapicera rodea la G y aparecen
 * el nombre y el botón (≤ 1,1 s, estático con "reducir movimiento").
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col px-6 pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <div className="flex flex-1 flex-col justify-center py-8">
        <div aria-hidden className="grid gap-2">
          <span className="reveal-rule h-px bg-line-strong" style={delay(0)} />
          <span className="reveal-rule h-px w-4/5 bg-border" style={delay(60)} />
        </div>
        <div className="my-6 flex justify-center">
          <BrandMark size={132} animated />
        </div>
        <div aria-hidden className="grid gap-2">
          <span className="reveal-rule h-px w-4/5 bg-border" style={delay(120)} />
          <span className="reveal-rule h-px bg-line-strong" style={delay(180)} />
        </div>

        <div className="reveal-rise mt-6 text-center" style={delay(600)}>
          <h1 className="font-display text-numeral-xl font-bold">Galf</h1>
          <p className="mt-1 text-base text-muted-foreground">El anotador del grupo</p>
        </div>

        <div className="reveal-rise mt-10 grid gap-3" style={delay(820)}>
          <GoogleButton next={next} />
          {error && <Notice tone="error">No pudimos iniciar sesión. Probá de nuevo.</Notice>}
        </div>
      </div>

      <p className="reveal-rise text-center text-sm text-muted-foreground" style={delay(840)}>
        Solo para el grupo. Si no podés entrar, pedile a quien administra que te agregue.
      </p>
    </main>
  );
}
