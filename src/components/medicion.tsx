'use client';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {useTranslations} from 'next-intl';
import {medir,borrarIdentificadoresMedicion,preferenciasMedicion,comprobarPermisoMedicion,excluirNavegadorAdministrativo,navegadorAdministrativo} from '@/lib/analitica-cliente';
import {abrirPreferenciasMedicion,cerrarPreferenciasMedicion,preferenciasMedicionAbiertas,preferenciasMedicionServidor,suscribirPreferenciasMedicion} from '@/lib/preferencias-medicion';
import {VERSION_PUBLICIDAD} from '@/lib/campanas-modelo';
import {sincronizarPublicidad} from '@/lib/publicidad-cliente';
import {rutaPublica} from '@/lib/analitica-modelo';
export function Medicion(){
 const ultimaRuta=useRef<string|null>(null),publicidadAnterior=useRef(false);
 const ruta=usePathname(),t=useTranslations('Analitica');const abierto=useSyncExternalStore(suscribirPreferenciasMedicion,preferenciasMedicionAbiertas,preferenciasMedicionServidor),[version,setVersion]=useState(0);
 useEffect(()=>{borrarIdentificadoresMedicion();const abrir=abrirPreferenciasMedicion;window.addEventListener('sg-abrir-preferencias',abrir);return()=>window.removeEventListener('sg-abrir-preferencias',abrir);},[]);
 useEffect(()=>{
  if(document.body.dataset.administracionMedicion==='1')excluirNavegadorAdministrativo();
  if(!rutaPublica(ruta)){ultimaRuta.current=ruta;if(ruta.startsWith('/panel')&&document.body.dataset.excluirMedicion==='1')excluirNavegadorAdministrativo();return;}
  // Mostrar una elección equilibrada solo si aún no hay preferencia y el navegador es elegible.
  if(!preferenciasMedicion()&&!navegadorAdministrativo()&&document.body.dataset.excluirMedicion!=='1'&&document.body.dataset.administracionMedicion!=='1')abrirPreferenciasMedicion();
  let control:AbortController|undefined;
  const comprobar=async()=>{
   control?.abort();const actual=new AbortController();control=actual;
   if(!await comprobarPermisoMedicion(actual.signal)||actual.signal.aborted)return;
   const publicidad=preferenciasMedicion()?.publicidad===true;
   void sincronizarPublicidad(publicidad);if(actual.signal.aborted)return;if(ultimaRuta.current!==ruta){ultimaRuta.current=ruta;medir('pagina');if(ruta.startsWith('/tienda/'))medir('producto',ruta.split('/')[2]);}else if(publicidad&&!publicidadAnterior.current)medir('pagina');
   publicidadAnterior.current=publicidad;
  };
  const volver=()=>{if(document.visibilityState==='visible')void comprobar();};
  const almacenamiento=(e:StorageEvent)=>{if(e.key==='sg-medicion'&&preferenciasMedicion())cerrarPreferenciasMedicion();if(e.key==='sg-excluir-medicion'||e.key==='sg-medicion')void comprobar();};
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
 function elegir(publicidad:boolean){void sincronizarPublicidad(publicidad);try{localStorage.setItem('sg-medicion',JSON.stringify({publicidad,version:VERSION_PUBLICIDAD}));}catch{}if(!publicidad){window.fbq?.('consent','revoke');for(const nombre of ['_fbp','_fbc'])document.cookie=`${nombre}=; Max-Age=0; Path=/`; }borrarIdentificadoresMedicion();cerrarPreferenciasMedicion();setVersion(v=>v+1);}
 if(!rutaPublica(ruta))return null;
 return abierto&&<section className="medicion-aviso" aria-label={t('titulo')}><h2>{t('titulo')}</h2><p>{t('consentimiento')}</p><Link href="/privacidad">{t('privacidad')}</Link><div><button onClick={()=>elegir(false)}>{t('rechazar')}</button><button onClick={()=>elegir(true)}>{t('aceptar')}</button></div></section>;
}
