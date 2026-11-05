import {leerAccesoPanel} from '@/lib/acceso-panel';
import {leerBytesLimitados} from '@/lib/limites-http';
import {subirImagen} from '@/app/panel/imagenes';

const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
/** Stable endpoint: an open editor can still upload after a new deployment. */
export async function POST(request:Request){
 if(await leerAccesoPanel()!=='administrador')return Response.json({error:'sinPermiso'},{status:403,headers});
 let mismoOrigen=false;
 try{const origen=new URL(request.headers.get('origin')??'');mismoOrigen=['http:','https:'].includes(origen.protocol)&&origen.host===(request.headers.get('host')||new URL(request.url).host);}catch{}
 if(!mismoOrigen)return Response.json({error:'sinPermiso'},{status:403,headers});
 let datos:FormData;
 try{
  const bytes=await leerBytesLimitados(request,8*1024*1024+65536);
  datos=await new Response(bytes.buffer as ArrayBuffer,{headers:{'Content-Type':request.headers.get('content-type')??''}}).formData();
 }catch{return Response.json({error:'archivoInvalido'},{status:400,headers});}
 try{
  const resultado=await subirImagen(datos);
  return Response.json(resultado,{status:resultado.src?200:resultado.error==='archivoInvalido'?400:resultado.error==='sinPermiso'?403:503,headers});
 }catch{return Response.json({error:'errorCarga'},{status:503,headers});}
}
