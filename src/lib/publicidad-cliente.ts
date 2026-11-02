'use client';
import {VERSION_PUBLICIDAD,origenCampana,eventoPublicidadNavegador,type EventoPublicidad} from './campanas-modelo';
import {publicidadHabilitada} from './preferencias-medicion';
let sincronizacion:Promise<boolean>|undefined;
let version=0;
let revocacion=0;
let primera:ReturnType<typeof origenCampana>|undefined,clicInicial:string|undefined;
/** Capture only after advertising consent, before asynchronous permission checks/navigation. */
export function leerAdquisicionPublicidad(){
 if(!publicidadHabilitada())return undefined;
 const q=new URLSearchParams(location.search);let externa=document.referrer;
 try{if(new URL(externa).origin===location.origin)externa='';}catch{}
 const clic=q.get('fbclid');
 return {origen:origenCampana(location.search,externa),clic:clic&&/^[A-Za-z0-9_-]{1,300}$/.test(clic)?clic:undefined};
}
export function sincronizarPublicidad(permitir:boolean,captura=permitir?leerAdquisicionPublicidad():undefined){
 const actual=++version,previa=sincronizacion;
 if(!permitir){revocacion++;primera=undefined;clicInicial=undefined;}
 // Read the acquisition before waiting for a previous request. A route change
 // during that wait must not replace the URL that originated this operation.
 const origen=captura?.origen??origenCampana('','');
 if(permitir&&captura){primera??=origen;if(captura.clic)clicInicial=captura.clic;}
 const cuerpo=permitir?{permitir:true,version:VERSION_PUBLICIDAD,primera,adquisicion:origen.canal==='directo'&&primera?primera:origen,...(clicInicial?{fbclid:clicInicial}:{})}:{permitir:false};
 const tarea=(async()=>{
  if(previa)await previa.catch(()=>false);
  // A newer consent must never skip the revocation already queued before it.
  if(actual!==version&&permitir)return false;
  try{
   const r=await fetch('/api/publicidad/contexto',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(cuerpo),credentials:'same-origin',referrerPolicy:'no-referrer',cache:'no-store',signal:AbortSignal.timeout(8000)});
   return actual===version&&r.ok&&(await r.json()).activo===true;
  }catch{return false;}
 })();sincronizacion=tarea;return tarea;
}
export function enviarPublicidad(evento:EventoPublicidad,ruta:string,producto?:string){
 const datos=eventoPublicidadNavegador.safeParse({id:crypto.randomUUID(),evento,ruta,...(producto?{producto}:{})});
 if(!datos.success)return;
 const permisoOriginal=revocacion;
 void (async()=>{
  // Focus/pageshow can supersede the request a PageView is waiting on. Wait
  // for the current request, but never revive an event across a revocation.
  let pendiente=sincronizacion;
  if(!pendiente)return;
  for(;;){
   const activa=await pendiente;
   if(permisoOriginal!==revocacion)return;
   if(pendiente!==sincronizacion){pendiente=sincronizacion!;continue;}
   if(!activa)return;
   break;
  }
  try{if(!publicidadHabilitada()||localStorage.getItem('sg-excluir-medicion')==='1'||document.body.dataset.excluirMedicion==='1')return;}catch{return;}
  await fetch('/api/publicidad/evento',{method:'POST',headers:{'Content-Type':'application/json','X-SG-Idioma':document.documentElement.lang==='en'?'en':'es'},body:JSON.stringify(datos.data),credentials:'same-origin',referrerPolicy:'no-referrer',cache:'no-store',keepalive:true}).catch(()=>{});
 })();
}

/** A campaign label only; never expose fbc/fbp, signed context or identity to WhatsApp. */
export function campanaConsultaActual(){
 try{if(!publicidadHabilitada()||localStorage.getItem('sg-excluir-medicion')==='1'||document.body.dataset.excluirMedicion!=='0')return '';return leerAdquisicionPublicidad()?.origen.campana||primera?.campana||'';}catch{return '';}
}
