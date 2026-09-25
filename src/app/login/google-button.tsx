"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function GoogleButton({ next }: { next?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function signIn() {
    setLoading(true);
    setError(false);
    try {
      const supabase = createClient();
      const callback = new URL("/auth/callback", window.location.origin);
      if (next) callback.searchParams.set("next", next);
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback.toString() } });
      if (error) throw error;
    } catch {
      setLoading(false);
      setError(true);
    }
  }

  return (
    <div className="grid w-full gap-2">
      <Button variant="secondary" size="lg" className="w-full" pending={loading} pendingLabel="Redirigiendo…" onClick={signIn}>
        <GoogleLogo />
        Entrar con Google
      </Button>
      {error && (
        <p role="alert" className="text-center text-sm text-destructive">
          No pudimos abrir Google. Revisá la conexión y probá de nuevo.
        </p>
      )}
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg className="size-5" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
      <path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}
