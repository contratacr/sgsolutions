'use client';
import {conteoAnonimo} from './estadisticas-agregadas-modelo';
import {rutaPublica,type EventoAnalitica} from './analitica-modelo';
type Pixel=((...args:unknown[])=>void)&{queue:unknown[][];loaded:boolean;version:string;callMethod?:(...args:unknown[])=>void};
declare global {interface Window {fbq?:Pixel;_fbq?:Pixel;}}
export function preferenciasMedicion(){try{const p=JSON.parse(localStorage.getItem('sg-medicion')||'null');return typeof p?.publicidad==='boolean'?{publicidad:p.publicidad}:null;}catch{return null;}}
export function borrarIdentificadoresMedicion(){
 try{sessionStorage.removeItem('sg-medicion-sesion');sessionStorage.removeItem('sg-medicion-actividad');localStorage.removeItem('sg-medicion-visitante');}catch{}
 document.cookie=`sg-analitica=; Path=/; Max-Age=0; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;
}
let permisoEnRevision=false;
export function navegadorAdministrativo(){try{return localStorage.getItem('sg-excluir-medicion')==='1';}catch{return false;}}
export function excluirNavegadorAdministrativo(){
 try{localStorage.setItem('sg-excluir-medicion','1');}catch{}
 document.body.dataset.excluirMedicion='1';delete document.body.dataset.permisoConteo;
 window.fbq?.('consent','revoke');
}
export async function comprobarPermisoMedicion(signal:AbortSignal){
 permisoEnRevision=true;
 try{
  if(navegadorAdministrativo()||document.body.dataset.administracionMedicion==='1'){excluirNavegadorAdministrativo();return false;}
  const r=await fetch('/api/medicion/permiso',{credentials:'same-origin',cache:'no-store',referrerPolicy:'no-referrer',signal});
  if(!r.ok)throw new Error('SIN_PERMISO');
  const datos=await r.json();if(signal.aborted)return false;
  if(datos.administracion===true)excluirNavegadorAdministrativo();
  if(datos.excluir!==false||typeof datos.permiso!=='string'){document.body.dataset.excluirMedicion='1';return false;}
  document.body.dataset.excluirMedicion='0';document.body.dataset.permisoConteo=datos.permiso;return true;
 }catch{if(!signal.aborted)document.body.dataset.excluirMedicion='1';return false;}
 finally{if(!signal.aborted)permisoEnRevision=false;}
}
export function medir(tipo:EventoAnalitica['tipo'],detalle=''){
 if(permisoEnRevision||navegadorAdministrativo()||document.body.dataset.excluirMedicion==='1')return;
 const p=preferenciasMedicion();if(!rutaPublica(location.pathname))return;
 const datos=conteoAnonimo.safeParse({tipo,ruta:location.pathname.startsWith('/tienda/')?'/tienda/producto':location.pathname,detalle,dispositivo:innerWidth<=760?'movil':'escritorio',idioma:document.documentElement.lang==='en'?'en':'es'});
 const permiso=document.body.dataset.permisoConteo;
 if(datos.success&&permiso)void fetch('/api/estadisticas',{method:'POST',headers:{'Content-Type':'application/json','X-SG-Conteo':permiso},body:JSON.stringify(datos.data),credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',keepalive:true}).catch(()=>{});
 if(p?.publicidad&&window.fbq){const estandar:Partial<Record<EventoAnalitica['tipo'],string>>={pagina:'PageView',producto:'ViewContent',carrito:'AddToCart',whatsapp:'Contact',correo:'Contact',telefono:'Contact'};const nombre=estandar[tipo];if(nombre)window.fbq('track',nombre,tipo==='producto'||tipo==='carrito'?{content_ids:[detalle],content_type:'product'}:{});else window.fbq('trackCustom',tipo,{detalle});}
}
export function iniciarPixel(id:string){
 if(permisoEnRevision||navegadorAdministrativo()||document.body.dataset.excluirMedicion==='1')return;
 if(!/^\d{5,25}$/.test(id)||!preferenciasMedicion()?.publicidad)return;
 if(window.fbq){window.fbq('consent','grant');return;}
 const pixel:Pixel=Object.assign((...args:unknown[])=>{if(pixel.callMethod)pixel.callMethod(...args);else pixel.queue.push(args);},{queue:[] as unknown[][],loaded:true,version:'2.0'});
 window.fbq=window._fbq=pixel;pixel('consent','grant');pixel('set','autoConfig',false,id);pixel('init',id);
 const script=document.createElement('script');script.async=true;script.src='https://connect.facebook.net/en_US/fbevents.js';document.head.append(script);
}
