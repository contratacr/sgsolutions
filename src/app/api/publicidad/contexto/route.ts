import {z} from 'zod';
import {origenPermitido} from '@/lib/origen-permitido';
import {leerTextoLimitado} from '@/lib/limites-http';
import {permitirRafaga} from '@/lib/limite-rafagas';
import {VERSION_PUBLICIDAD,adquisicion} from '@/lib/campanas-modelo';
import {actualizarContexto} from '@/lib/publicidad-servidor';
const esquema=z.discriminatedUnion('permitir',[z.object({permitir:z.literal(false)}).strict(),z.object({permitir:z.literal(true),version:z.literal(VERSION_PUBLICIDAD),primera:adquisicion.optional(),adquisicion,fbclid:z.string().regex(/^[A-Za-z0-9_-]{1,300}$/).optional()}).strict()]);
export async function POST(request:Request){
 if(!origenPermitido(request))return new Response(null,{status:403});
 if(!permitirRafaga('publicidad-contexto',2000,60000))return new Response(null,{status:429});
 try{const datos=esquema.parse(JSON.parse(await leerTextoLimitado(request,2048)));const activo=await actualizarContexto(datos);return Response.json({activo},{headers:{'Cache-Control':'private, no-store'}});}catch(error){return new Response(null,{status:error instanceof z.ZodError||error instanceof SyntaxError?400:503});}
}
