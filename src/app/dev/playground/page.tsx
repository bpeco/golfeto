import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { playgroundEnabled } from "@/lib/public-paths";
import { Playground } from "./playground";

export const metadata: Metadata = { title: "Playground", robots: { index: false } };

/** Catálogo de componentes con datos de mentira. Solo en desarrollo y en el Preview de Vercel (GALF_PLAYGROUND=1). */
export default async function PlaygroundPage({ searchParams }: { searchParams: Promise<{ variant?: string }> }) {
  if (!playgroundEnabled()) notFound();
  const { variant } = await searchParams;
  return <Playground variant={variant === "B" || variant === "C" ? variant : "A"} />;
}
