import { describe, expect, it } from "vitest";
import { z } from "./zod";
import { fail, friendlyDbError, fromZod, ok } from "./action-result";

describe("ok / fail", () => {
  it("arman el resultado", () => {
    expect(ok({ id: "x" })).toEqual({ ok: true, data: { id: "x" } });
    expect(fail("No", { name: "Poné un nombre" })).toEqual({ ok: false, error: "No", fields: { name: "Poné un nombre" } });
  });
});

describe("fromZod", () => {
  const schema = z.object({
    name: z.string().min(1, "Poné un nombre"),
    guests: z.array(z.object({ name: z.string().min(1, "Falta el nombre del invitado") })),
  });
  it("un mensaje por campo con la ruta con puntos", () => {
    const r = schema.safeParse({ name: "", guests: [{ name: "Juan" }, { name: "" }] });
    const res = fromZod(r.error!);
    expect(res.fields).toEqual({ name: "Poné un nombre", "guests.1.name": "Falta el nombre del invitado" });
    expect(res.error).toBe("Revisá los campos marcados.");
  });
  it("el locale por defecto es español", () => {
    const r = z.number().min(3).safeParse(1);
    expect(r.error!.issues[0].message).toMatch(/Demasiado pequeño/);
  });
});

describe("friendlyDbError", () => {
  it("pasa las excepciones propias de la base, prolijas", () => {
    expect(friendlyDbError({ code: "P0001", message: "La tarjeta está firmada; desfirmala para editar los golpes" })).toBe(
      "La tarjeta está firmada. Desfirmala para editar los golpes.",
    );
    expect(friendlyDbError("Código de invitación inválido")).toBe("Código de invitación inválido.");
  });
  it("traduce RLS, red, sesión y unicidad", () => {
    expect(friendlyDbError({ code: "42501", message: 'new row violates row-level security policy for table "groups"' })).toBe("No tenés permiso para esto.");
    expect(friendlyDbError("TypeError: fetch failed")).toBe("Sin conexión. Probá de nuevo.");
    expect(friendlyDbError({ code: "PGRST301", message: "JWT expired" })).toBe("Tu sesión venció. Volvé a entrar.");
    expect(friendlyDbError({ code: "23505", message: "duplicate key value violates unique constraint" })).toBe("Eso ya existe.");
  });
  it("nunca devuelve el mensaje técnico crudo", () => {
    expect(friendlyDbError({ code: "XX000", message: "internal error at foo.bar" })).toBe("No se pudo guardar. Probá de nuevo.");
    expect(friendlyDbError(undefined)).toBe("No se pudo guardar. Probá de nuevo.");
  });
});
