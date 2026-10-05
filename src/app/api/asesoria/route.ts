import {origenPermitido} from '@/lib/origen-permitido';
import {z} from 'zod';
import {crearAsesoria,referenciaAsesoria} from '@/lib/asesorias';
import {leerCatalogoPublico} from '@/lib/catalogo-servidor';
const esquema=z.object({idioma:z.enum(['es','en']),articulos:z.array(z.object({id:z.string().regex(/^[a-z0-9-]{1,60}$/),cantidad:z.number().int().min(1).max(99)})).max(30),contacto:z.object({nombre:z.string().trim().min(2).max(100),telefono:z.string().regex(/^[1-9]\d{9,14}$/),necesidad:z.string().trim().min(5).max(1000)}).strict().optional(),consentimiento:z.literal(true).optional()}).strict().refine(x=>x.contacto?x.consentimiento===true:x.articulos.length>0);

export async function POST(request:Request){
 if(!origenPermitido(request))return Response.json({error:'origen'},{status:403});
 let entrada:z.infer<typeof esquema>;try{const texto=await request.text();if(texto.length>10000)throw new Error('limite');entrada=esquema.parse(JSON.parse(texto));}catch{return Response.json({error:'datos_invalidos'},{status:400});}
 if(new Set(entrada.articulos.map(x=>x.id)).size!==entrada.articulos.length)return Response.json({error:'datos_invalidos'},{status:400});
 try{const c=entrada.articulos.length?await leerCatalogoPublico():{productos:[]};const articulos=entrada.articulos.flatMap(x=>{const producto=c.productos.find(p=>p.id===x.id);return producto?[{producto,cantidad:x.cantidad}]:[];});
 if(articulos.length!==entrada.articulos.length)return Response.json({error:'catalogo_actualizado'},{status:409});
 const s=await crearAsesoria(articulos,entrada.idioma,entrada.contacto);return Response.json({referencia:referenciaAsesoria(s.id)},{status:201,headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'no_disponible'},{status:503});}
}
