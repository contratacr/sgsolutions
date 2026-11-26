'use client';
import {agregarReferenciaWhatsApp} from '@/lib/contactos-comerciales-modelo';
import {campanaConsultaActual} from '@/lib/publicidad-cliente';
import {recuperarParametrosMeta,borrarCookiesMeta} from '@/lib/parametros-meta-cliente';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {X} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {medir,borrarIdentificadoresMedicion,preferenciasMedicion,comprobarPermisoMedicion,excluirNavegadorAdministrativo} from '@/lib/analitica-cliente';
import {abrirPreferenciasMedicion,cerrarPreferenciasMedicion,preferenciasMedicionAbiertas,preferenciasMedicionServidor,suscribirPreferenciasMedicion,publicidadHabilitada,leerPreferenciasMedicion,VERSION_PREFERENCIAS_MEDICION,guardarPreferenciasMedicion,aceptarPendiente,type OrigenPreferencia} from '@/lib/preferencias-medicion';
import {sincronizarPublicidad,leerAdquisicionPublicidad,leerAterrizaje,type Aterrizaje} from '@/lib/publicidad-cliente';
import {rutaPublica} from '@/lib/analitica-modelo';
/** The Capacitor shell marks the runtime; there only the Continuar button accepts. */
function appNativa(){return typeof window!=='undefined'&&Boolean((window as unknown as {Capacitor?:{isNativePlatform?:()=>boolean}}).Capacitor?.isNativePlatform?.());}
const AVISO_MOSTRADO='sg-aviso-mostrado';
export function Medicion(){
 const tituloRef=useRef<HTMLHeadingElement>(null);
 const ultimaRuta=useRef<string|null>(null),publicidadAnterior=useRef(false),analiticaAnterior=useRef(false),aterrizaje=useRef<Aterrizaje|null>(null),avisoRef=useRef<HTMLElement>(null);
 const ruta=usePathname(),t=useTranslations('Analitica');const abierto=useSyncExternalStore(suscribirPreferenciasMedicion,preferenciasMedicionAbiertas,preferenciasMedicionServidor),[version,setVersion]=useState(0),[ajustes,setAjustes]=useState(false),[analitica,setAnalitica]=useState(true),[publicidad,setPublicidad]=useState(true);
 useEffect(()=>{borrarIdentificadoresMedicion();const abrir=()=>{const p=leerPreferenciasMedicion();setAnalitica(p?.analitica??true);setPublicidad(p?.publicidad??true);setAjustes(true);abrirPreferenciasMedicion();};window.addEventListener('sg-abrir-preferencias',abrir);if(!leerPreferenciasMedicion())abrirPreferenciasMedicion();return()=>window.removeEventListener('sg-abrir-preferencias',abrir);},[]);
 // Acceptance by browsing (decision of the owner, see docs/campanas-y-conversiones.md). It counts only when the notice
 // was already on screen in this tab and the visitor moves to ANOTHER page; the first view, reloads, an open settings
 // panel, admin pages and the native app never count. Declared before the measurement effect so the new route is measured with consent.
 useEffect(()=>{
  if(!abierto||ajustes||ruta.startsWith('/admin')||ruta.startsWith('/panel'))return;
  if(leerPreferenciasMedicion()){return;}
  if(document.body.dataset.excluirMedicion==='1')return;
  aterrizaje.current??=leerAterrizaje();
  if(appNativa())return;
  let visto:string|null=null;
  try{visto=sessionStorage.getItem(AVISO_MOSTRADO);if(visto===null){sessionStorage.setItem(AVISO_MOSTRADO,ruta);return;}}catch{return;}
  if(visto===ruta)return;
  if(aceptarPendiente('implicit')){try{sessionStorage.removeItem(AVISO_MOSTRADO);}catch{}terminarEleccion(true);}
 },[abierto,ajustes,ruta]);
 useEffect(()=>{
  const aviso=avisoRef.current,raiz=document.documentElement;
  if(!aviso||aviso.classList.contains('medicion-aviso--ajustes')){raiz.style.removeProperty('--medicion-alto');return;}
  const medir=()=>raiz.style.setProperty('--medicion-alto',`${Math.ceil(aviso.getBoundingClientRect().height)}px`);
  medir();const observador=new ResizeObserver(medir);observador.observe(aviso);
  return()=>{observador.disconnect();raiz.style.removeProperty('--medicion-alto');};
 });
 useEffect(()=>{
  if(document.body.dataset.administracionMedicion==='1')excluirNavegadorAdministrativo();
  if(!rutaPublica(ruta)){ultimaRuta.current=ruta;if(ruta.startsWith('/panel')&&document.body.dataset.excluirMedicion==='1')excluirNavegadorAdministrativo();return;}
  let control:AbortController|undefined;
  const comprobar=async()=>{
   const heredada=publicidadHabilitada()?aterrizaje.current:null;if(heredada)aterrizaje.current=null;
   const adquisicion=leerAdquisicionPublicidad(heredada??undefined);
   control?.abort();const actual=new AbortController();control=actual;
   if(!await comprobarPermisoMedicion(actual.signal)||actual.signal.aborted)return;
   const publicidad=publicidadHabilitada(),analitica=Boolean(leerPreferenciasMedicion()?.analitica);
   if(publicidad){await Promise.race([recuperarParametrosMeta(heredada?.href),new Promise<void>(r=>setTimeout(r,800))]);if(actual.signal.aborted)return;}
   void sincronizarPublicidad(publicidad,adquisicion);if(actual.signal.aborted)return;if(ultimaRuta.current!==ruta){ultimaRuta.current=ruta;if(analitica||publicidad)medir('pagina');if(ruta.startsWith('/tienda/')&&(analitica||publicidad))medir('producto',ruta.split('/')[2]);}else if((publicidad&&!publicidadAnterior.current)||(analitica&&!analiticaAnterior.current)){const canales={analitica:analitica&&!analiticaAnterior.current,publicidad:publicidad&&!publicidadAnterior.current};medir('pagina','',canales);if(ruta.startsWith('/tienda/'))medir('producto',ruta.split('/')[2],canales);}
   publicidadAnterior.current=publicidad;analiticaAnterior.current=analitica;
  };
  const volver=()=>{if(document.visibilityState==='visible')void comprobar();};
  const almacenamiento=(e:StorageEvent)=>{if(e.key==='sg-medicion'||e.key===null){if(preferenciasMedicion())cerrarPreferenciasMedicion();else abrirPreferenciasMedicion();}if(e.key==='sg-excluir-medicion'||e.key==='sg-medicion'||e.key===null)void comprobar();};
  void comprobar();window.addEventListener('focus',volver);window.addEventListener('pageshow',volver);window.addEventListener('storage',almacenamiento);document.addEventListener('visibilitychange',volver);
  const clic=(e:MouseEvent)=>{const el=e.target instanceof Element?e.target:null;const enlace=el?.closest<HTMLAnchorElement>('a[href]');if(enlace){const url=new URL(enlace.href,location.href);if(url.hostname==='wa.me'){if(rutaPublica(location.pathname))enlace.href=agregarReferenciaWhatsApp(enlace.href,location.pathname,campanaConsultaActual(),document.documentElement.lang);medir('whatsapp',enlace.closest('footer')?'footer':enlace.classList.contains('whatsapp-flotante')?'flotante':'contenido');}else if(url.protocol==='mailto:'||url.hostname==='outlook.office.com')medir('correo');else if(url.protocol==='tel:')medir('telefono');else if(['www.google.com','www.waze.com'].includes(url.hostname))medir('mapa');else if(['www.instagram.com','www.facebook.com'].includes(url.hostname))medir('red_social',url.hostname);}
   if(el?.closest('.caso-galeria button'))medir('galeria');
  };
  const formularios=new Map<HTMLFormElement,{tipo:string;enviando:boolean;completo:boolean;ultimoError:number}>();
  const tipoFormulario=(el:EventTarget|null)=>el instanceof Element?el.closest<HTMLFormElement>('form[data-medicion-formulario]'):null;
  const empezar=(e:Event)=>{const f=tipoFormulario(e.target);if(!f||formularios.has(f))return;const tipo=f.dataset.medicionFormulario!;formularios.set(f,{tipo,enviando:false,completo:false,ultimoError:0});medir('formulario_inicio',tipo);};
  const enviar=(e:Event)=>{const f=tipoFormulario(e.target),estado=f&&formularios.get(f);if(estado)estado.enviando=true;};
  const registrarError=(estado:{tipo:string;enviando:boolean;ultimoError:number})=>{estado.enviando=false;const ahora=Date.now();if(ahora-estado.ultimoError<1000)return;estado.ultimoError=ahora;medir('formulario_error',estado.tipo);};
  const invalido=(e:Event)=>{const f=tipoFormulario(e.target),estado=f&&formularios.get(f);if(estado){registrarError(estado);}};
  const recibido=(e:Event)=>{for(const estado of formularios.values())if(estado.tipo===(e as CustomEvent).detail)estado.completo=true;};
  const revisarFormularios=()=>{for(const [f,estado] of formularios){if(f.isConnected)continue;if(!estado.completo&&!estado.enviando)medir('formulario_abandono',estado.tipo);formularios.delete(f);}};
  const cambios=new MutationObserver(registros=>{for(const r of registros)for(const n of r.addedNodes)if(n instanceof Element&&(n.matches('[role=alert]')||n.querySelector('[role=alert]'))){const f=n.closest<HTMLFormElement>('form[data-medicion-formulario]'),estado=f&&formularios.get(f);if(estado){registrarError(estado);}}revisarFormularios();});
  cambios.observe(document.body,{childList:true,subtree:true});document.addEventListener('input',empezar,true);document.addEventListener('submit',enviar,true);document.addEventListener('invalid',invalido,true);window.addEventListener('sg-formulario-recibido',recibido);
  const vistos=new Set<number>();const scroll=()=>{const max=document.documentElement.scrollHeight-innerHeight;if(max<=0)return;const porcentaje=scrollY/max*100;for(const n of [25,50,75,100])if(porcentaje>=n-1&&!vistos.has(n)){vistos.add(n);medir('scroll',String(n));}};
  document.addEventListener('click',clic);window.addEventListener('scroll',scroll,{passive:true});return()=>{control?.abort();cambios.disconnect();document.removeEventListener('input',empezar,true);document.removeEventListener('submit',enviar,true);document.removeEventListener('invalid',invalido,true);window.removeEventListener('sg-formulario-recibido',recibido);window.removeEventListener('focus',volver);window.removeEventListener('pageshow',volver);window.removeEventListener('storage',almacenamiento);document.removeEventListener('visibilitychange',volver);document.removeEventListener('click',clic);window.removeEventListener('scroll',scroll);};
 },[ruta,version]);
 function terminarEleccion(permitirPublicidad:boolean){
  const p=leerPreferenciasMedicion();setAnalitica(p?.analitica??true);setPublicidad(p?.publicidad??true);
  if(permitirPublicidad){void sincronizarPublicidad(true,leerAdquisicionPublicidad(aterrizaje.current??undefined));}else{aterrizaje.current=null;void sincronizarPublicidad(false);window.fbq?.('consent','revoke');borrarCookiesMeta();}
  borrarIdentificadoresMedicion();cerrarPreferenciasMedicion();setAjustes(false);setVersion(v=>v+1);
 }
 function elegir(permitirAnalitica:boolean,permitirPublicidad:boolean,origen:OrigenPreferencia='click'){const preferencia={analitica:permitirAnalitica,publicidad:permitirPublicidad,version:VERSION_PREFERENCIAS_MEDICION,fecha:new Date().toISOString(),origen};guardarPreferenciasMedicion(preferencia);terminarEleccion(permitirPublicidad);}
 // Continuar accepts what is still undecided; a refusal saved earlier is kept. The X does the same on the web; in the native app it only closes.
 function continuar(){if(aceptarPendiente('click'))terminarEleccion(Boolean(leerPreferenciasMedicion()?.publicidad));else cerrarPreferenciasMedicion();}
 function cerrarAviso(){if(appNativa()){cerrarPreferenciasMedicion();return;}if(aceptarPendiente('close'))terminarEleccion(Boolean(leerPreferenciasMedicion()?.publicidad));else cerrarPreferenciasMedicion();}
 if(ruta.startsWith('/admin')||ruta.startsWith('/panel'))return null;
 const guardadas=leerPreferenciasMedicion(),mostrarAjustes=ajustes||Boolean(guardadas);
 return abierto&&<section ref={avisoRef} className={`medicion-aviso${mostrarAjustes?' medicion-aviso--ajustes':''}`} role="dialog" aria-modal="false" aria-labelledby="medicion-titulo">
  <h2 id="medicion-titulo" ref={tituloRef} tabIndex={-1}>{t(mostrarAjustes?'tituloAjustes':'titulo')}</h2>
  <p>{t(mostrarAjustes?'detalleAjustes':'consentimiento')}</p>
  {mostrarAjustes?<>
   <div className="medicion-categorias">
    <div className="medicion-categoria">
     <div className="medicion-categoria-fija"><strong>{t('necesarias')}</strong><b>{t('siempre')}</b></div>
     <p>{t('necesariasDetalle')}</p>
     <details><summary>{t('masInformacion')}<span className="sr-only">: {t('necesarias')}</span></summary><p>{t('necesariasInformacion')}</p></details>
    </div>
    <div className="medicion-categoria">
     <label><input type="checkbox" checked={analitica} onChange={e=>setAnalitica(e.target.checked)}/><span><strong>{t('analitica')}</strong><small>{t('analiticaDetalle')}</small></span></label>
     <details><summary>{t('masInformacion')}<span className="sr-only">: {t('analitica')}</span></summary><p>{t('analiticaInformacion')}</p></details>
    </div>
    <div className="medicion-categoria">
     <label><input type="checkbox" checked={publicidad} onChange={e=>setPublicidad(e.target.checked)}/><span><strong>{t('publicidad')}</strong><small>{t('publicidadDetalle')}</small></span></label>
     <details><summary>{t('masInformacion')}<span className="sr-only">: {t('publicidad')}</span></summary><p>{t('publicidadInformacion')}</p></details>
    </div>
   </div>
   <div className="medicion-guardar">
    <button onClick={()=>elegir(true,true)}>{t('aceptarTodo')}</button>
    <button onClick={()=>elegir(analitica,publicidad)}>{t('guardar')}</button>
   </div>
   <div className="medicion-enlaces">
    <button type="button" onClick={()=>{if(guardadas)cerrarPreferenciasMedicion();else setAjustes(false);}}>{t(guardadas?'cerrar':'volver')}</button>
    <Link href="/privacidad">{t('privacidad')}</Link>
   </div>
  </>:<>
   <button type="button" className="medicion-cerrar" aria-label={t('cerrarAviso')} onClick={cerrarAviso}><X aria-hidden="true" size={20}/></button>
   <div className="medicion-acciones">
    <button type="button" onClick={continuar}>{t('continuar')}</button>
   </div>
   <div className="medicion-enlaces">
    <Link href="/privacidad#legal-4">{t('politicaCookies')}</Link>
   </div>
  </>}
 </section>;
}
