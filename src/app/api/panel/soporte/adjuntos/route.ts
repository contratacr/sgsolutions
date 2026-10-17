import {listarAdjuntosLocales,guardarAdjuntoLocal} from '@/lib/soporte-local';
import {z} from 'zod';
import {imageSize} from 'image-size';
import {accesoSoporte} from '@/lib/soporte-servidor';
import {leerBytesLimitados} from '@/lib/limites-http';
const cabeceras={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
export async function GET(request:Request){
 try{
  const acceso=await accesoSoporte(),ticket=new URL(request.url).searchParams.get('ticket');
  if(!z.uuid().safeParse(ticket).success)return new Response(null,{status:400,headers:cabeceras});
  if(acceso.local)return Response.json(await listarAdjuntosLocales(ticket!),{headers:cabeceras});
  const r=await acceso.cliente.from('soporte_adjuntos').select('id,nombre').eq('ticket_id',ticket).order('creado_en');
  return r.error?new Response(null,{status:503,headers:cabeceras}):Response.json(r.data,{headers:cabeceras});
 }catch{return new Response(null,{status:403,headers:cabeceras});}
}
export async function POST(request:Request){
 const origen=request.headers.get('origin');let valido=false;try{const url=new URL(origen||'');valido=['http:','https:'].includes(url.protocol)&&url.host===(request.headers.get('host')||new URL(request.url).host);}catch{}
 if(!valido)return new Response(null,{status:403,headers:cabeceras});
 let acceso:Awaited<ReturnType<typeof accesoSoporte>>;try{acceso=await accesoSoporte();}catch{return new Response(null,{status:403,headers:cabeceras});}
 try{
  let form:FormData;
  try{const bytes=await leerBytesLimitados(request,6*1024*1024);form=await new Response(bytes.buffer as ArrayBuffer,{headers:{'Content-Type':request.headers.get('content-type')??''}}).formData();}catch{return new Response(null,{status:413,headers:cabeceras});}
  const ticket=z.uuid().safeParse(form.get('ticket')),archivo=form.get('archivo');
  if(!ticket.success||!(archivo instanceof File)||archivo.size<100||archivo.size>5*1024*1024)return new Response(null,{status:400,headers:cabeceras});
  const bytes=new Uint8Array(await archivo.arrayBuffer());let imagen;try{imagen=imageSize(bytes);}catch{return new Response(null,{status:400,headers:cabeceras});}
  const tipos:Record<string,{mime:string;extension:string}>={jpg:{mime:'image/jpeg',extension:'jpg'},png:{mime:'image/png',extension:'png'},webp:{mime:'image/webp',extension:'webp'}};
  const tipo=tipos[imagen.type??''];
  if(!tipo||tipo.mime!==archivo.type||!imagen.width||!imagen.height||imagen.width*imagen.height>30000000)return new Response(null,{status:400,headers:cabeceras});
  const nombre=archivo.name.replace(/[\x00-\x1f\x7f/\\]/g,'').trim().slice(0,180)||`imagen.${tipo.extension}`;
  if(acceso.local){await guardarAdjuntoLocal(ticket.data,nombre,tipo.mime,bytes);return Response.json({ok:true},{headers:cabeceras});}
  const {cliente}=acceso;
  const {data:caso,error}=await cliente.from('soporte_tickets').select('id').eq('id',ticket.data).eq('archivado',false).maybeSingle();
  if(error||!caso)return new Response(null,{status:404,headers:cabeceras});
  const ruta=`${ticket.data}/${crypto.randomUUID()}.${tipo.extension}`,bucket=cliente.storage.from('soporte-privado');
  const subida=await bucket.upload(ruta,bytes,{contentType:tipo.mime,upsert:false});if(subida.error)return new Response(null,{status:503,headers:cabeceras});
  const r=await cliente.rpc('registrar_adjunto_soporte',{ticket:ticket.data,ruta_archivo:ruta,nombre_archivo:nombre,tipo_archivo:tipo.mime,tamano:bytes.length});
  if(r.error){const guardado=await cliente.from('soporte_adjuntos').select('id').eq('ruta',ruta).maybeSingle();if(!guardado.error&&guardado.data)return Response.json({ok:true},{headers:cabeceras});if(!guardado.error)await bucket.remove([ruta]);return new Response(null,{status:409,headers:cabeceras});}
  return Response.json({ok:true},{headers:cabeceras});
 }catch{return new Response(null,{status:503,headers:cabeceras});}
}
