import {leerTextoLimitado} from '@/lib/limites-http';
import {origenPermitido} from '@/lib/origen-permitido';
import {patronIdFavorito} from '@/lib/favoritos-identidad';
import {crearClienteCuenta} from '@/lib/supabase/cuenta';
import {leerCatalogoPublico} from '@/lib/catalogo-servidor';
import {z} from 'zod';
const id=z.string().regex(patronIdFavorito);
const entrada=z.union([z.object({id,guardar:z.boolean()}).strict(),z.object({importar:z.array(id).max(100)}).strict()]);
async function sesion(){const cliente=await crearClienteCuenta();if(!cliente)return null;const {data:{user}}=await cliente.auth.getUser();if(!user)return null;const {data,error}=await cliente.rpc('cuenta_habilitada');return !error&&data===true?{cliente,user}:null;}
export async function GET(){const s=await sesion();if(!s)return Response.json({}, {status:401});const {data,error}=await s.cliente.from('favoritos').select('producto_id').eq('usuario_id',s.user.id);return error?Response.json({}, {status:503}):Response.json({usuario:s.user.id,ids:data.map(x=>x.producto_id)},{headers:{'Cache-Control':'private, no-store'}});}
export async function POST(request:Request){if(!origenPermitido(request))return Response.json({}, {status:403});let texto:string;try{texto=await leerTextoLimitado(request,10000);}catch{return Response.json({}, {status:413});}if(texto.length>10000)return Response.json({}, {status:413});let datos;try{datos=entrada.parse(JSON.parse(texto));}catch{return Response.json({}, {status:400});}const s=await sesion();if(!s)return Response.json({}, {status:401});
 if('id' in datos&&!datos.guardar){const {error}=await s.cliente.from('favoritos').delete().eq('usuario_id',s.user.id).eq('producto_id',datos.id);return new Response(null,{status:error?503:204});}
 const catalogo=await leerCatalogoPublico();const validos=new Set(catalogo.productos.map(p=>p.id));const ids=[...new Set('importar' in datos?datos.importar:[datos.id])].filter(x=>validos.has(x));if(!ids.length)return Response.json({}, {status:400});const existentes=await s.cliente.from('favoritos').select('producto_id').eq('usuario_id',s.user.id);if(existentes.error)return Response.json({}, {status:503});const actuales=new Set(existentes.data.map(x=>x.producto_id));const nuevos=ids.filter(x=>!actuales.has(x)).slice(0,Math.max(0,100-actuales.size));if(!nuevos.length)return new Response(null,{status:204});const {error}=await s.cliente.from('favoritos').upsert(nuevos.map(producto_id=>({usuario_id:s.user.id,producto_id})),{onConflict:'usuario_id,producto_id',ignoreDuplicates:true});return new Response(null,{status:error?503:204});}
