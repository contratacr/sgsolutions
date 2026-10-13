import { z } from "zod";
import {empresa} from './empresa';
import {imagenesSitio,imagenSitioValida,type ImagenSitio} from './imagenes-sitio';
function ibanValido(v:string){if(!/^CR\d{20}$/.test(v))return false;let resto=0;for(const digito of (v.slice(4)+v.slice(0,4)).replace(/[A-Z]/g,l=>String(l.charCodeAt(0)-55)))resto=(resto*10+Number(digito))%97;return resto===1;}
const numeroContacto=(mas:boolean)=>z.string().trim().transform(v=>{const n=v.replace(/[\s()+-]/g,'');return (mas?'+':'')+(n.length===8?'506'+n:n);}).pipe(z.string().regex(mas?/^\+506\d{8}$/:/^506\d{8}$/));
const borrador=z.object({es:z.string().trim().max(4000),en:z.string().trim().max(4000)});
const texto = z.object({
  es: z.string().trim().min(1).max(4000),
  en: z.string().trim().min(1).max(4000),
});
const imagen = z
  .string()
  .max(1000)
  .refine(imagenSitioValida);
export const esquemaContenido = z
  .object({
    casos: z
      .array(
        z.object({
          id: z.string().regex(/^[a-z0-9-]{1,60}$/),
          publicado: z.boolean(),
          cliente: z.string().trim().max(150),
          categoria: borrador,
          titulo: borrador,
          descripcion: borrador,
          solucion: borrador,
          fotos: z
            .array(z.object({ src: imagen, alt: borrador, caption: borrador }))
            .max(12),
        }),
      )
      .max(100),
    textos: z.record(
      z.string().regex(/^[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z0-9_]+)+$/),
      texto,
    ),
    contacto:z.object({telefono:numeroContacto(true),whatsapp:numeroContacto(false),correo:z.email(),instagram:z.url().startsWith('https://'),facebook:z.url().startsWith('https://'),mapa:z.url().startsWith('https://'),waze:z.url().startsWith('https://')}).default(empresa),
    imagenes:z.object(Object.fromEntries(Object.entries(imagenesSitio).map(([k,v])=>[k,imagen.default(v)])) as Record<ImagenSitio,z.ZodDefault<typeof imagen>>).default(imagenesSitio),
    pagos: z.object({
      titular: z.string().min(1).max(150),
      sinpe: z.string().regex(/^\d{8}$/),
      cuentas: z
        .array(
          z.object({
            banco: z.string().min(1).max(80),
            cuentaCorta: z.string().regex(/^[0-9-]{0,40}$/).optional(),
            iban: z.string().trim().transform(v=>v.replace(/\s/g,'').toUpperCase()).refine(ibanValido),
          }),
        )
        .min(1).max(5),
    }),
  })
  .superRefine((c, ctx) => {
    if (new Set(c.casos.map((x) => x.id)).size !== c.casos.length)
      ctx.addIssue({ code: "custom", message: "IDs duplicados" });
    c.casos.forEach((caso,i)=>{
      if(!caso.publicado)return;
      if(!caso.cliente)ctx.addIssue({code:'custom',message:'REQUERIDO',path:['casos',i,'cliente']});
      for(const campo of ['categoria','titulo','descripcion','solucion'] as const)for(const idioma of ['es','en'] as const)if(!caso[campo][idioma])ctx.addIssue({code:'custom',message:'REQUERIDO',path:['casos',i,campo,idioma]});
      if(!caso.fotos.length)ctx.addIssue({code:'custom',message:'REQUERIDO',path:['casos',i,'fotos']});
      caso.fotos.forEach((f,j)=>{for(const idioma of ['es','en'] as const)if(!f.alt[idioma])ctx.addIssue({code:'custom',message:'REQUERIDO',path:['casos',i,'fotos',j,'alt',idioma]});});
    });
  });
export type Contenido = z.infer<typeof esquemaContenido>;
