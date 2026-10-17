import {leerTextoLimitado} from '@/lib/limites-http';
import {permisoConteoValido} from '@/lib/permiso-conteo';
import {conteoAnonimo} from '@/lib/estadisticas-agregadas-modelo';
import {registrarConteo} from '@/lib/estadisticas-agregadas-servidor';
let ventana=0,peticiones=0;
export async function POST(request:Request){
 const origen=request.headers.get('origin');
 let valido=false;
 try{const url=new URL(origen||'');valido=['http:','https:'].includes(url.protocol)&&url.host===(request.headers.get('host')||new URL(request.url).host);}catch{}
 if(!valido)return new Response(null,{status:403});
 // A bounded per-instance burst limit, without IPs or browser fingerprints.
 const minuto=Math.floor(Date.now()/60000);if(ventana!==minuto){ventana=minuto;peticiones=0;}if(++peticiones>2000)return new Response(null,{status:429});
 if(Number(request.headers.get('content-length')||0)>2048)return new Response(null,{status:413});
 let texto:string;try{texto=await leerTextoLimitado(request,2048);}catch{return new Response(null,{status:413});}if(texto.length>2048)return new Response(null,{status:413});
 let datos;try{datos=conteoAnonimo.safeParse(JSON.parse(texto));}catch{return new Response(null,{status:400});}
 if(!datos.success)return new Response(null,{status:400});
 // This endpoint must never inspect an account or forward its credentials.
 // The initial server render excludes administrators (including failed role checks)
 // and supplies a permit shared by all eligible visitors, never a visitor ID.
 if(request.headers.has('cookie')||request.headers.has('authorization'))return new Response(null,{status:204});
 if(!permisoConteoValido(request.headers.get('x-sg-conteo')))return new Response(null,{status:403});
 try{
  await registrarConteo(datos.data);return new Response(null,{status:204});}catch{return new Response(null,{status:503});}
}
