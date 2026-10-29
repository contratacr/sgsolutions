'use client';
import {VERSION_PUBLICIDAD} from './campanas-modelo';
import {publicidadHabilitada} from './preferencias-medicion';
import {enviarPublicidad,sincronizarPublicidad} from './publicidad-cliente';
import {conteoAnonimo} from './estadisticas-agregadas-modelo';
import {rutaPublica,type EventoAnalitica} from './analitica-modelo';
type Pixel=((...args:unknown[])=>void)&{queue:unknown[][];loaded:boolean;version:string;callMethod?:(...args:unknown[])=>void};
declare global {interface Window {fbq?:Pixel;_fbq?:Pixel;}}
export function preferenciasMedicion(){try{const p=JSON.parse(localStorage.getItem('sg-medicion')||'null');return typeof p?.publicidad==='boolean'?{publicidad:p.publicidad&&p.version===VERSION_PUBLICIDAD}:null;}catch{return null;}}
export function borrarIdentificadoresMedicion(){
 try{sessionStorage.removeItem('sg-medicion-sesion');sessionStorage.removeItem('sg-medicion-actividad');localStorage.removeItem('sg-medicion-visitante');}catch{}
 document.cookie=`sg-analitica=; Path=/; Max-Age=0; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;
}
let permisoEnRevision=false;
export function navegadorAdministrativo(){try{return localStorage.getItem('sg-excluir-medicion')==='1';}catch{return false;}}
export function excluirNavegadorAdministrativo(){
 try{localStorage.setItem('sg-excluir-medicion','1');}catch{}
 document.body.dataset.excluirMedicion='1';delete document.body.dataset.permisoConteo;
 window.fbq?.('consent','revoke');void sincronizarPublicidad(false);
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
 if(!rutaPublica(location.pathname))return;
 const datos=conteoAnonimo.safeParse({tipo,ruta:location.pathname.startsWith('/tienda/')?'/tienda/producto':location.pathname,detalle,dispositivo:innerWidth<=760?'movil':'escritorio',idioma:document.documentElement.lang==='en'?'en':'es'});
 if(!datos.success)return;
 const permiso=document.body.dataset.permisoConteo;
 if(datos.success&&permiso)void fetch('/api/estadisticas',{method:'POST',headers:{'Content-Type':'application/json','X-SG-Conteo':permiso},body:JSON.stringify(datos.data),credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',keepalive:true}).catch(()=>{});
 if(publicidadHabilitada()){const nombres:Partial<Record<EventoAnalitica['tipo'],import('./campanas-modelo').EventoPublicidad>>={pagina:'PageView',producto:'ViewContent',carrito:'AddToCart',busqueda:'Search',whatsapp:'WhatsAppClick',correo:'ContactClick',telefono:'ContactClick',pedido_revisado:'InitiateCheckout'};const evento=nombres[tipo];if(evento)enviarPublicidad(evento,location.pathname.startsWith('/tienda/')?'/tienda/producto':location.pathname,['producto','carrito'].includes(tipo)?detalle:undefined);}
}
/** Kept for older imports; advertising uses only the server transport. */
export function iniciarPixel(_id:string){void _id;}
