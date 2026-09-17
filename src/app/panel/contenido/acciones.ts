"use server";
import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import es from "../../../../messages/es.json";
import en from "../../../../messages/en.json";
import { esquemaContenido } from "@/lib/contenido-modelo";
export async function guardarContenido(datos: unknown, revision: number) {
  const c = await crearClienteServidor();
  if (!c) return { error: "noDisponible" };
  const {
    data: { user },
  } = await c.auth.getUser();
  if (!user) return { error: "sinPermiso" };
  const { data: perfil } = await c
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .eq("activo", true)
    .maybeSingle();
  if (perfil?.rol !== "administrador") return { error: "sinPermiso" };
  const p = esquemaContenido.safeParse(datos);
  if (!p.success || !Number.isInteger(revision) || revision < 0)
    return { error: "validacion" };
  for (const [clave, valor] of Object.entries(p.data.textos)) {
    const [ns, k] = clave.split(".");
    for (const l of ["es", "en"] as const) {
      const original = (
        (l === "es" ? es : en) as Record<string, Record<string, unknown>>
      )[ns]?.[k];
      if (typeof original !== "string") return { error: "validacion" };
      const parametros = (v: string) =>
        [...v.matchAll(/\{([^{}]+)\}/g)]
          .map((m) => m[1])
          .sort()
          .join("|");
      if (
        parametros(valor[l]) !== parametros(original) ||
        /[{}]/.test(valor[l].replace(/\{[^{}]+\}/g, ""))
      )
        return { error: "validacion" };
    }
  }
  const { data, error } = await c.rpc("guardar_contenido", {
    privado: p.data,
    visible: { ...p.data, casos: p.data.casos.filter((x) => x.publicado) },
    revision_esperada: revision,
  });
  if (error)
    return {
      error: error.message.includes("CONFLICTO") ? "conflicto" : "error",
    };
  revalidatePath("/", "layout");
  return { revision: Number(data) };
}
