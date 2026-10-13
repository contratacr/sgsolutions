'use client';
import {rutaPublica,type EventoAnalitica} from './analitica-modelo';
type Pixel=((...args:unknown[])=>void)&{queue:unknown[][];loaded:boolean;version:string;callMethod?:(...args:unknown[])=>void};
declare global {interface Window {fbq?:Pixel;_fbq?:Pixel;}}
export function preferenciasMedicion(){try{return JSON.parse(localStorage.getItem('sg-medicion')||'null') as {analitica:boolean;publicidad:boolean}|null;}catch{return null;}}
let sesion:string|undefined,visitante:string|undefined,actividad=0;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function borrarIdentificadoresMedicion(){
 sesion=visitante=undefined;actividad=0;
 try{sessionStorage.removeItem('sg-medicion-sesion');sessionStorage.removeItem('sg-medicion-actividad');localStorage.removeItem('sg-medicion-visitante');}catch{}
}
function identificadores(){
 const ahora=Date.now();
 try{
  const guardada=sessionStorage.getItem('sg-medicion-sesion'),ultima=Number(sessionStorage.getItem('sg-medicion-actividad'));
  sesion=guardada&&uuid.test(guardada)&&ultima>ahora-30*60_000?guardada:crypto.randomUUID();
  sessionStorage.setItem('sg-medicion-sesion',sesion);sessionStorage.setItem('sg-medicion-actividad',String(ahora));actividad=ahora;
 }catch{if(!sesion||actividad<ahora-30*60_000)sesion=crypto.randomUUID();actividad=ahora;}
 try{
  const guardado=JSON.parse(localStorage.getItem('sg-medicion-visitante')||'null');
  visitante=guardado&&typeof guardado.id==='string'&&uuid.test(guardado.id)&&guardado.vence>ahora?guardado.id:crypto.randomUUID();
  if(guardado?.id!==visitante)localStorage.setItem('sg-medicion-visitante',JSON.stringify({id:visitante,vence:ahora+30*86400000}));
 }catch{visitante??=crypto.randomUUID();}
 return {sesion:sesion!,visitante:visitante!};
}
export function medir(tipo:EventoAnalitica['tipo'],detalle=''){
 const p=preferenciasMedicion();if(!rutaPublica(location.pathname))return;
 if(p?.analitica){
  const ids=identificadores();
  const campana=new URLSearchParams(location.search).get('utm_campaign')||'';
  const evento:EventoAnalitica={id:crypto.randomUUID(),...ids,tipo,ruta:location.pathname,detalle,dispositivo:innerWidth<=760?'movil':'escritorio',idioma:document.documentElement.lang==='en'?'en':'es',campana:/^[a-zA-Z0-9_-]{1,80}$/.test(campana)?campana:''};
  void fetch('/api/analitica',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(evento),keepalive:true}).catch(()=>{});
 }
 if(p?.publicidad&&window.fbq){const estandar:Partial<Record<EventoAnalitica['tipo'],string>>={pagina:'PageView',producto:'ViewContent',carrito:'AddToCart',whatsapp:'Contact',correo:'Contact',telefono:'Contact'};const nombre=estandar[tipo];if(nombre)window.fbq('track',nombre,tipo==='producto'||tipo==='carrito'?{content_ids:[detalle],content_type:'product'}:{});else window.fbq('trackCustom',tipo,{detalle});}
}
export function iniciarPixel(id:string){
 if(!/^\d{5,25}$/.test(id)||!preferenciasMedicion()?.publicidad)return;
 if(window.fbq){window.fbq('consent','grant');return;}
 const pixel:Pixel=Object.assign((...args:unknown[])=>{if(pixel.callMethod)pixel.callMethod(...args);else pixel.queue.push(args);},{queue:[] as unknown[][],loaded:true,version:'2.0'});
 window.fbq=window._fbq=pixel;pixel('consent','grant');pixel('set','autoConfig',false,id);pixel('init',id);
 const script=document.createElement('script');script.async=true;script.src='https://connect.facebook.net/en_US/fbevents.js';document.head.append(script);
}
