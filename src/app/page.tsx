import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Galf</h1>
        <form action="/auth/signout" method="post">
          <button className="text-sm text-muted underline">Salir</button>
        </form>
      </header>
      <p className="mt-6 text-muted">
        Hola, {user?.user_metadata?.full_name ?? user?.email}. Todavía no hay grupos ni partidas.
      </p>
    </main>
  );
}
