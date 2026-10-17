import {leerAdjuntoLocal} from '@/lib/soporte-local';
import {z} from 'zod';
import {accesoSoporte} from '@/lib/soporte-servidor';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"};
 try{
  const acceso=await accesoSoporte(),{id}=await params;
  if(!z.uuid().safeParse(id).success)return new Response(null,{status:404,headers});
  if(acceso.local){const archivo=await leerAdjuntoLocal(id);if(!archivo)return new Response(null,{status:404,headers});return new Response(new Uint8Array(archivo.bytes),{headers:{...headers,'Content-Type':archivo.tipo,'Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(archivo.nombre)}`}});}
  const {cliente}=acceso;
  const r=await cliente.from('soporte_adjuntos').select('ruta,nombre,tipo').eq('id',id).maybeSingle();
  if(r.error||!r.data)return new Response(null,{status:404,headers});
  const archivo=await cliente.storage.from('soporte-privado').download(r.data.ruta);
  if(archivo.error||!archivo.data)return new Response(null,{status:404,headers});
  return new Response(archivo.data,{headers:{...headers,'Content-Type':r.data.tipo,'Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(r.data.nombre)}`}});
 }catch{return new Response(null,{status:403,headers});}
}
