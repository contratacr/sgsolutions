'use client';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {useTranslations} from 'next-intl';
import {medir,borrarIdentificadoresMedicion,preferenciasMedicion,comprobarPermisoMedicion,excluirNavegadorAdministrativo} from '@/lib/analitica-cliente';
import {abrirPreferenciasMedicion,cerrarPreferenciasMedicion,preferenciasMedicionAbiertas,preferenciasMedicionServidor,suscribirPreferenciasMedicion,publicidadHabilitada,leerPreferenciasMedicion,VERSION_PREFERENCIAS_MEDICION,guardarPreferenciasMedicion} from '@/lib/preferencias-medicion';
import {sincronizarPublicidad} from '@/lib/publicidad-cliente';
import {rutaPublica} from '@/lib/analitica-modelo';
export function Medicion(){
 const tituloRef=useRef<HTMLHeadingElement>(null);
 const ultimaRuta=useRef<string|null>(null),publicidadAnterior=useRef(false),analiticaAnterior=useRef(false);
 const ruta=usePathname(),t=useTranslations('Analitica');const abierto=useSyncExternalStore(suscribirPreferenciasMedicion,preferenciasMedicionAbiertas,preferenciasMedicionServidor),[version,setVersion]=useState(0),[ajustes,setAjustes]=useState(false),[analitica,setAnalitica]=useState(false),[publicidad,setPublicidad]=useState(false);
 useEffect(()=>{borrarIdentificadoresMedicion();const abrir=()=>{const p=leerPreferenciasMedicion();if(p){setAnalitica(p.analitica);setPublicidad(p.publicidad);setAjustes(true);}abrirPreferenciasMedicion();};window.addEventListener('sg-abrir-preferencias',abrir);if(!leerPreferenciasMedicion())abrirPreferenciasMedicion();return()=>window.removeEventListener('sg-abrir-preferencias',abrir);},[]);
 useEffect(()=>{
  if(document.body.dataset.administracionMedicion==='1')excluirNavegadorAdministrativo();
  if(!rutaPublica(ruta)){ultimaRuta.current=ruta;if(ruta.startsWith('/panel')&&document.body.dataset.excluirMedicion==='1')excluirNavegadorAdministrativo();return;}
  let control:AbortController|undefined;
  const comprobar=async()=>{
   control?.abort();const actual=new AbortController();control=actual;
   if(!await comprobarPermisoMedicion(actual.signal)||actual.signal.aborted)return;
   const publicidad=publicidadHabilitada(),analitica=Boolean(leerPreferenciasMedicion()?.analitica);
   void sincronizarPublicidad(publicidad);if(actual.signal.aborted)return;if(ultimaRuta.current!==ruta){ultimaRuta.current=ruta;if(analitica||publicidad)medir('pagina');if(ruta.startsWith('/tienda/')&&(analitica||publicidad))medir('producto',ruta.split('/')[2]);}else if((publicidad&&!publicidadAnterior.current)||(analitica&&!analiticaAnterior.current))medir('pagina','',{analitica:analitica&&!analiticaAnterior.current,publicidad:publicidad&&!publicidadAnterior.current});
   publicidadAnterior.current=publicidad;analiticaAnterior.current=analitica;
  };
  const volver=()=>{if(document.visibilityState==='visible')void comprobar();};
  const almacenamiento=(e:StorageEvent)=>{if(e.key==='sg-medicion'||e.key===null){if(preferenciasMedicion())cerrarPreferenciasMedicion();else abrirPreferenciasMedicion();}if(e.key==='sg-excluir-medicion'||e.key==='sg-medicion'||e.key===null)void comprobar();};
  void comprobar();window.addEventListener('focus',volver);window.addEventListener('pageshow',volver);window.addEventListener('storage',almacenamiento);document.addEventListener('visibilitychange',volver);
  const clic=(e:MouseEvent)=>{const el=e.target instanceof Element?e.target:null;const enlace=el?.closest<HTMLAnchorElement>('a[href]');if(enlace){const url=new URL(enlace.href,location.href);if(url.hostname==='wa.me')medir('whatsapp',enlace.closest('footer')?'footer':enlace.classList.contains('whatsapp-flotante')?'flotante':'contenido');else if(url.protocol==='mailto:'||url.hostname==='outlook.office.com')medir('correo');else if(url.protocol==='tel:')medir('telefono');else if(['www.google.com','www.waze.com'].includes(url.hostname))medir('mapa');else if(['www.instagram.com','www.facebook.com'].includes(url.hostname))medir('red_social',url.hostname);}
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
 function elegir(permitirAnalitica:boolean,permitirPublicidad:boolean){const preferencia={analitica:permitirAnalitica,publicidad:permitirPublicidad,version:VERSION_PREFERENCIAS_MEDICION,fecha:new Date().toISOString()};guardarPreferenciasMedicion(preferencia);void sincronizarPublicidad(permitirPublicidad);if(!permitirPublicidad){window.fbq?.('consent','revoke');for(const nombre of ['_fbp','_fbc'])document.cookie=`${nombre}=; Max-Age=0; Path=/`; }borrarIdentificadoresMedicion();cerrarPreferenciasMedicion();setAjustes(false);setVersion(v=>v+1);}
 if(ruta.startsWith('/admin')||ruta.startsWith('/panel'))return null;
 const guardadas=leerPreferenciasMedicion(),mostrarAjustes=ajustes||Boolean(guardadas);
 return abierto&&<section className="medicion-aviso" role="dialog" aria-modal="false" aria-labelledby="medicion-titulo"><h2 id="medicion-titulo" ref={tituloRef} tabIndex={-1}>{t('titulo')}</h2><p>{t(mostrarAjustes?'detalleAjustes':'consentimiento')}</p>{mostrarAjustes&&<Link href="/privacidad">{t('privacidad')}</Link>}{mostrarAjustes?<div className="medicion-categorias"><p><strong>{t('necesarias')}</strong><span>{t('necesariasDetalle')}</span><b>{t('siempre')}</b></p><label><input type="checkbox" checked={analitica} onChange={e=>setAnalitica(e.target.checked)}/><span><strong>{t('analitica')}</strong><small>{t('analiticaDetalle')}</small></span></label><label><input type="checkbox" checked={publicidad} onChange={e=>setPublicidad(e.target.checked)}/><span><strong>{t('publicidad')}</strong><small>{t('publicidadDetalle')}</small></span></label><button onClick={()=>elegir(analitica,publicidad)}>{t('guardar')}</button><button onClick={()=>elegir(false,false)}>{t('soloNecesarias')}</button></div>:<><div className="medicion-acciones"><button onClick={()=>elegir(true,true)}>{t('aceptarTodo')}</button><button onClick={()=>elegir(false,false)}>{t('soloNecesarias')}</button></div><div className="medicion-enlaces"><button type="button" onClick={()=>{setAnalitica(false);setPublicidad(false);setAjustes(true);requestAnimationFrame(()=>tituloRef.current?.focus());}}>{t('ajustesCookies')}</button><Link href="/privacidad">{t('privacidad')}</Link></div></>}{mostrarAjustes&&<button className="medicion-volver" onClick={()=>{if(guardadas)cerrarPreferenciasMedicion();else setAjustes(false);}}>{t(guardadas?'cerrar':'volver')}</button>}</section>;
}
