'use client';
import {useState,useSyncExternalStore} from 'react';
import {useLocale,useTranslations} from 'next-intl';
import {Wifi,Building2,ShieldCheck,Laptop} from 'lucide-react';
import {IconoWhatsApp} from './icono-whatsapp';
import {enlaceWhatsApp} from '@/lib/empresa';
import {colones,traducir,type CatalogoPublico} from '@/lib/catalogo-modelo';

const suscribirOrigen=()=>()=>{};
export function AsesoriaWhatsApp({lineas=[],onSolicitar,className='boton boton-naranja',etiqueta='consultar',necesidad}:{lineas?:{producto:CatalogoPublico['productos'][number];cantidad:number}[];onSolicitar?:()=>void;className?:string;etiqueta?:'consultar'|'asesorar'|'consultarSeleccion';necesidad?:'red'|'negocio'|'seguridad'|'computadora'}){
 const Icono=necesidad?{red:Wifi,negocio:Building2,seguridad:ShieldCheck,computadora:Laptop}[necesidad]:null;
 const t=useTranslations('Asesoria'),n=useTranslations('Navegacion'),idioma=useLocale();
 const [ocupado,setOcupado]=useState(false),[error,setError]=useState(false),[preparado,setPreparado]=useState<{clave:string;url:string}|null>(null);
 const clave=JSON.stringify(lineas.map(x=>({id:x.producto.id,cantidad:x.cantidad})))+idioma;
 const enlacePreparado=preparado?.clave===clave?preparado.url:'';
 const origen=useSyncExternalStore(suscribirOrigen,()=>location.protocol==='https:'?location.origin:'',()=>'');
 const limpio=(s:string)=>s.replace(/[\u0000-\u001f\u007f\u202a-\u202e*~`]/g,' ').replace(/\s+/g,' ').trim().slice(0,140);
 const productos=lineas.map(({producto:p,cantidad})=>[
  `*${cantidad} × ${limpio(traducir(p.nombre,idioma))}*`,
  p.codigoFabricante?`${t('codigo')}: ${limpio(p.codigoFabricante)}`:'',
  p.precio!==null?`${t('precioReferencia')}: ${colones(p.precio)}`:'',
  origen?`${origen}/soluciones/${p.id}`:''
 ].filter(Boolean).join('\n'));
 const mensaje=[t('mensajeInicio'),necesidad?t('mensajeNecesidad',{necesidad:t(necesidad)}):'',...productos,
  lineas.length?t('mensajeCierre'):necesidad?'':t('mensajeGeneral')
 ].filter(Boolean).join('\n\n');
 async function solicitar(e:React.MouseEvent<HTMLAnchorElement>){
  if(!lineas.length||enlacePreparado){onSolicitar?.();return;}
  e.preventDefault();if(ocupado)return;setOcupado(true);setError(false);
  const ventana=window.open('about:blank','_blank');if(ventana)ventana.opener=null;
  try{const respuesta=await fetch('/api/asesoria',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idioma,articulos:lineas.map(x=>({id:x.producto.id,cantidad:x.cantidad}))})});const datos=await respuesta.json();if(!respuesta.ok||typeof datos.referencia!=='string')throw new Error('SOLICITUD');onSolicitar?.();const url=enlaceWhatsApp(`${mensaje}\n\n*${t('referencia')}: ${datos.referencia}*`);if(ventana&&!ventana.closed){const enlace=ventana.document.createElement('a');enlace.href=url;enlace.rel='noopener noreferrer';enlace.target='_self';enlace.click();}else setPreparado({clave,url});}catch{ventana?.close();setError(true);}finally{setOcupado(false);}
 }
 return <><a href={enlacePreparado||enlaceWhatsApp(mensaje)} className={className} onClick={solicitar} aria-disabled={ocupado} target="_blank" rel="noopener noreferrer"><>{Icono?<Icono size={20} aria-hidden="true"/>:<IconoWhatsApp width={20} height={20}/>}</>{ocupado?t('preparando'):t(necesidad??etiqueta)}<span className="sr-only">{n('nuevaPestana')}</span></a>{error&&<p role="alert">{t('errorSolicitud')}</p>}</>;
}
