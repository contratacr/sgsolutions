import {after} from 'next/server';
import {origenPermitido} from '@/lib/origen-permitido';
import {leerTextoLimitado} from '@/lib/limites-http';
import {permitirRafaga} from '@/lib/limite-rafagas';
import {eventoPublicidadNavegador} from '@/lib/campanas-modelo';
import {contextoActual,encolarPublicidad,idMedicion,procesarPublicidad} from '@/lib/publicidad-servidor';
import {hitoNegocio} from '@/lib/medicion-negocio';
import {leerCatalogoPublico} from '@/lib/catalogo-servidor';
export async function POST(request:Request){
 if(!origenPermitido(request))return new Response(null,{status:403});
 if(!permitirRafaga('publicidad-evento',2000,60000))return new Response(null,{status:429});
 let e;try{e=eventoPublicidadNavegador.parse(JSON.parse(await leerTextoLimitado(request,2048)));}catch{return new Response(null,{status:400});}
 try{const c=await contextoActual();if(!c)return new Response(null,{status:204});
  let producto:string|undefined;
  if(['ViewContent','AddToCart'].includes(e.evento)){if(!e.producto)return new Response(null,{status:400});const catalogo=await leerCatalogoPublico();producto=catalogo.productos.find(p=>p.id===e.producto||p.slug===e.producto)?.id;if(!producto)return new Response(null,{status:400});}
  const id=idMedicion('navegador:'+e.id);
  if(e.evento==='PageView')await hitoNegocio('campana_visita',id,request.headers.get('x-sg-idioma')==='en'?'en':'es',c);
  await encolarPublicidad(c,e.evento,id,e.ruta,producto);after(async()=>{try{await procesarPublicidad();}catch{console.error('PUBLICIDAD_PROCESO_PENDIENTE');}});
  return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});
 }catch{return new Response(null,{status:503});}
}
