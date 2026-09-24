import { GoogleButton } from "./google-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6">
      <div className="text-center">
        <h1 className="text-5xl font-black tracking-tight">Galf</h1>
        <p className="mt-2 text-muted">Anotador de golf para el grupo</p>
      </div>
      <GoogleButton next={next} />
      {error && (
        <p className="text-sm text-red-600">
          No pudimos iniciar sesión. Probá de nuevo.
        </p>
      )}
    </main>
  );
}
