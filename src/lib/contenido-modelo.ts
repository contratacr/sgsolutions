import { z } from "zod";
const texto = z.object({
  es: z.string().trim().min(1).max(4000),
  en: z.string().trim().min(1).max(4000),
});
const imagen = z
  .string()
  .max(1000)
  .regex(/^(\/imagenes\/[a-zA-Z0-9._/-]+|https:\/\/[^\s]+)$/);
export const esquemaContenido = z
  .object({
    casos: z
      .array(
        z.object({
          id: z.string().regex(/^[a-z0-9-]{1,60}$/),
          publicado: z.boolean(),
          cliente: z.string().min(1).max(150),
          categoria: texto,
          titulo: texto,
          descripcion: texto,
          solucion: texto,
          fotos: z
            .array(z.object({ src: imagen, alt: texto, caption: texto }))
            .min(1)
            .max(12),
        }),
      )
      .max(100),
    textos: z.record(
      z.string().regex(/^[A-Za-z][A-Za-z0-9]*\.[A-Za-z0-9_]+$/),
      texto,
    ),
    pagos: z.object({
      titular: z.string().min(1).max(150),
      sinpe: z.string().regex(/^\d{8}$/),
      cuentas: z
        .array(
          z.object({
            banco: z.string().min(1).max(80),
            iban: z.string().regex(/^CR\d{20}$/),
          }),
        )
        .max(5),
    }),
  })
  .superRefine((c, ctx) => {
    if (new Set(c.casos.map((x) => x.id)).size !== c.casos.length)
      ctx.addIssue({ code: "custom", message: "IDs duplicados" });
  });
export type Contenido = z.infer<typeof esquemaContenido>;
