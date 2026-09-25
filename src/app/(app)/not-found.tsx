import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <div className="pt-[calc(env(safe-area-inset-top)+1.5rem)]">
      <h1 className="mb-4 text-xl font-semibold">No está</h1>
      <EmptyState
        icon={SearchX}
        title="No encontramos esto."
        body="Puede haber sido dado de baja, o el link está mal."
        action={
          <Link href="/" className={buttonVariants({ variant: "secondary" })}>
            Ir al inicio
          </Link>
        }
      />
    </div>
  );
}
