import {leerTextoLimitado} from '@/lib/limites-http';
import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {origenPermitido} from '@/lib/origen-permitido';
import {clienteGoogleWeb,hashNonceGoogle} from '@/lib/google-identidad';
import {crearClienteCuenta} from '@/lib/supabase/cuenta';
import {errorCuenta} from '@/lib/cuenta-errores';
import {retornoCompra} from '@/lib/retorno-compra';

const cookie='sg-google-nonce';
const entrada=z.object({accion:z.enum(['preparar','ingresar']),credential:z.string().min(100).max(12000).optional(),registro:z.boolean().default(false),aceptado:z.boolean().default(false),retorno:z.string().max(512).optional()});
function respuesta(datos:unknown,status=200){return NextResponse.json(datos,{status,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});}
export async function POST(request:Request){
 if(!origenPermitido(request))return respuesta({error:'error'},403);
 if(Number(request.headers.get('content-length')??0)>14000)return respuesta({error:'error'},413);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return respuesta({error:'error'},415);
 try{
  const texto=await leerTextoLimitado(request,14000);
  if(texto.length>14000)return respuesta({error:'error'},413);
  const datos=entrada.safeParse(JSON.parse(texto));
  if(!datos.success)return respuesta({error:'error'},400);
  const id=clienteGoogleWeb();
  if(!id)return respuesta({error:'noDisponible'},503);
  const almacen=await cookies();
  const opciones={httpOnly:true,secure:new URL(request.headers.get('origin')!).protocol==='https:',sameSite:'strict' as const,path:'/cuenta/google'};
  if(datos.data.accion==='preparar'){
   const nonce=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
   almacen.set(cookie,`${Date.now()}.${nonce}`,{...opciones,maxAge:600});
   return respuesta({clientId:id,nonce:await hashNonceGoogle(nonce)});
  }
  const valor=almacen.get(cookie)?.value??'';
  almacen.set(cookie,'',{...opciones,maxAge:0});
  const [fecha,nonce]=valor.split('.');
  if(!/^\d{13}$/.test(fecha)||!nonce||!/^[a-f0-9]{64}$/.test(nonce)||Date.now()-Number(fecha)>600000||Number(fecha)>Date.now()||!datos.data.credential)return respuesta({error:'sesionVencida'},400);
  if(datos.data.registro&&!datos.data.aceptado)return respuesta({error:'aceptacionRequerida'},400);
  const cliente=await crearClienteCuenta();
  if(!cliente)return respuesta({error:'noDisponible'},503);
  // Supabase verifies Google's signature, audience, expiry and hashed nonce. Never
  // create/merge users here: the existing Google identity retains its user ID.
  const {error}=await cliente.auth.signInWithIdToken({provider:'google',token:datos.data.credential,nonce});
  if(error)return respuesta({error:errorCuenta(error)},400);
  const habilitada=await cliente.rpc('cuenta_habilitada');
  if(habilitada.error||habilitada.data!==true){
   await cliente.auth.signOut({scope:'local'});
   return respuesta({error:habilitada.error?'conexion':'cuentaBloqueada'},403);
  }
  if(datos.data.registro){
   const guardado=await cliente.auth.updateUser({data:{aceptacion_terminos_fecha:new Date().toISOString(),aceptacion_terminos_version:'2026-10-12'}});
   if(guardado.error){await cliente.auth.signOut({scope:'local'});return respuesta({error:'conexion'},503);}
  }
  return respuesta({destino:retornoCompra(datos.data.retorno)??'/cuenta'});
 }catch{return respuesta({error:'conexion'},503);}
}
