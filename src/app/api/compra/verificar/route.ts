import {z} from 'zod';
import {origenPermitido} from '@/lib/origen-permitido';
import {leerCatalogoPublico} from '@/lib/catalogo-servidor';
import {crearAsesoria,cambiarAsesoria,tokenAsesoria} from '@/lib/asesorias';
import {verificarCompraEurocomp} from '@/lib/eurocomp-compra';
const esquema=z.object({idioma:z.enum(['es','en']),articulos:z.array(z.object({id:z.string().regex(/^[a-z0-9-]{1,60}$/),cantidad:z.number().int().min(1).max(99),precio:z.number().positive()})).min(1).max(30)}).strict();
const intentos=new Map<string,{fecha:number;cantidad:number}>();
export async function POST(request:Request){
 if(!origenPermitido(request))return Response.json({error:'origen'},{status:403});
 const ip=request.headers.get('cf-connecting-ip')??'local';const previo=intentos.get(ip);const ahora=Date.now();
 if(previo&&ahora-previo.fecha<60_000){if(previo.cantidad>=5)return Response.json({error:'no_disponible'},{status:429});previo.cantidad++;}else{if(intentos.size>10000)intentos.clear();intentos.set(ip,{fecha:ahora,cantidad:1});}
 let entrada:z.infer<typeof esquema>;try{const texto=await request.text();if(texto.length>12000)throw new Error();entrada=esquema.parse(JSON.parse(texto));}catch{return Response.json({error:'datos_invalidos'},{status:400});}
 if(new Set(entrada.articulos.map(a=>a.id)).size!==entrada.articulos.length)return Response.json({error:'datos_invalidos'},{status:400});
 let etapa='catalogo';
 try{
  const c=await leerCatalogoPublico();const articulos=entrada.articulos.flatMap(a=>{const producto=c.productos.find(p=>p.coleccion!=='empresas'&&p.id===a.id&&p.precio===a.precio&&p.disponibilidad!=='agotado'&&p.codigoEurocomp);return producto?[{producto,cantidad:a.cantidad}]:[];});
  if(articulos.length!==entrada.articulos.length)return Response.json({error:'catalogo_actualizado'},{status:409});
  etapa='proveedor';
  await verificarCompraEurocomp(articulos);
  etapa='crear_verificacion';
  const s=await crearAsesoria(articulos,entrada.idioma,undefined,'tienda');const token=tokenAsesoria();
  etapa='aprobar_verificacion';
  const aprobada=await cambiarAsesoria(s.id,'solicitada',{estado:'aprobada',token,vence_en:new Date(Date.now()+10*60_000).toISOString()});
  if(!aprobada)throw new Error();
  return Response.json({id:s.id,token},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error('compra_verificacion_fallida',{etapa,codigo:e instanceof Error&&/^(catalogo_actualizado|configuracion|almacenamiento|conexion|respuesta|tiempo|codigo[0-9]+|ASESORIA_NO_DISPONIBLE|ASESORIA_NO_CONFIGURADA)$/.test(e.message)?e.message:'no_disponible'});return Response.json({error:e instanceof Error&&e.message==='catalogo_actualizado'?'catalogo_actualizado':'no_disponible'},{status:e instanceof Error&&e.message==='catalogo_actualizado'?409:503});}
}
