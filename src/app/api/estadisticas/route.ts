import {leerTextoLimitado} from '@/lib/limites-http';
import {crearClienteCuenta} from '@/lib/supabase/cuenta';
import {sesionLocal} from '@/lib/admin-local';
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
 try{
  if(await sesionLocal())return new Response(null,{status:204});
  if(/sb-[^;]+-auth-token/.test(request.headers.get('cookie')||'')){
   const cliente=await crearClienteCuenta();if(!cliente)return new Response(null,{status:503});
   const usuario=await cliente.auth.getUser();if(usuario.error)return new Response(null,{status:503});
   if(usuario.data.user){const perfil=await cliente.from('perfiles').select('rol').eq('id',usuario.data.user.id).maybeSingle();if(perfil.error)return new Response(null,{status:503});if(perfil.data?.rol==='administrador')return new Response(null,{status:204});}
  }
  await registrarConteo(datos.data);return new Response(null,{status:204});}catch{return new Response(null,{status:503});}
}
