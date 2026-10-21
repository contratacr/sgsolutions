'use client';
import {VERSION_PUBLICIDAD,origenCampana,eventoPublicidadNavegador,type EventoPublicidad} from './campanas-modelo';
let sincronizacion:Promise<boolean>|undefined;
let version=0;
let primera:ReturnType<typeof origenCampana>|undefined,clicInicial:string|undefined;
export function sincronizarPublicidad(permitir:boolean){
 const actual=++version;
 sincronizacion=(async()=>{
  try{
   const q=new URLSearchParams(location.search),ref=document.referrer;
   // An internal page is not a new acquisition source. Never transmit the URL/referrer.
   let externa=ref;try{if(new URL(ref).origin===location.origin)externa='';}catch{}
   const clic=q.get('fbclid'),origen=origenCampana(location.search,externa);primera??=origen;if(clic&&/^[A-Za-z0-9_-]{1,300}$/.test(clic))clicInicial=clic;
   const r=await fetch('/api/publicidad/contexto',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(permitir?{permitir:true,version:VERSION_PUBLICIDAD,primera,adquisicion:origen.canal==='directo'&&primera?primera:origen,...(clicInicial?{fbclid:clicInicial}:{})}:{permitir:false}),credentials:'same-origin',referrerPolicy:'no-referrer',cache:'no-store'});
   return actual===version&&r.ok&&(await r.json()).activo===true;
  }catch{return false;}
 })();return sincronizacion;
}
export function enviarPublicidad(evento:EventoPublicidad,ruta:string,producto?:string){
 const datos=eventoPublicidadNavegador.safeParse({id:crypto.randomUUID(),evento,ruta,...(producto?{producto}:{})});
 if(!datos.success)return;
 void (async()=>{
  if(!sincronizacion||!await sincronizacion)return;
  try{const p=JSON.parse(localStorage.getItem('sg-medicion')??'null');if(p?.publicidad!==true||p.version!==VERSION_PUBLICIDAD||localStorage.getItem('sg-excluir-medicion')==='1'||document.body.dataset.excluirMedicion==='1')return;}catch{return;}
  await fetch('/api/publicidad/evento',{method:'POST',headers:{'Content-Type':'application/json','X-SG-Idioma':document.documentElement.lang==='en'?'en':'es'},body:JSON.stringify(datos.data),credentials:'same-origin',referrerPolicy:'no-referrer',cache:'no-store',keepalive:true}).catch(()=>{});
 })();
}
