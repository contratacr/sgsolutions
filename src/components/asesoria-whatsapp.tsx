'use client';
import {useState,useSyncExternalStore} from 'react';
import {useLocale,useTranslations} from 'next-intl';
import {Wifi,Building2,ShieldCheck,Laptop} from 'lucide-react';
import {DatosAsesoria} from './contacto-asesoria';
import type {ContactoAsesoriaDatos} from '@/lib/contacto-asesoria';
import {IconoWhatsApp} from './icono-whatsapp';
import {enlaceWhatsApp} from '@/lib/empresa';
import {colones,traducir,type CatalogoPublico} from '@/lib/catalogo-modelo';

const suscribirOrigen=()=>()=>{};
export function AsesoriaWhatsApp({lineas=[],onSolicitar,className='boton boton-naranja',etiqueta='consultar',necesidad}:{lineas?:{producto:CatalogoPublico['productos'][number];cantidad:number}[];onSolicitar?:()=>void;className?:string;etiqueta?:'consultar'|'asesorar'|'consultarSeleccion';necesidad?:'red'|'negocio'|'seguridad'|'computadora'}){
 const Icono=necesidad?{red:Wifi,negocio:Building2,seguridad:ShieldCheck,computadora:Laptop}[necesidad]:null;
 const t=useTranslations('Asesoria'),n=useTranslations('Navegacion'),idioma=useLocale();
 const [abierto,setAbierto]=useState(false);
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
 async function solicitar(contacto:ContactoAsesoriaDatos){
  if(ocupado)return;setOcupado(true);setError(false);
  const ventana=window.open('/soluciones','_blank');if(ventana)ventana.opener=null;
  try{const respuesta=await fetch('/api/asesoria',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idioma,contacto,consentimiento:true,articulos:lineas.map(x=>({id:x.producto.id,cantidad:x.cantidad}))})});const datos=await respuesta.json();if(!respuesta.ok||typeof datos.referencia!=='string')throw new Error('SOLICITUD');onSolicitar?.();const url=enlaceWhatsApp(`${mensaje}\n\n${t('nombre')}: ${limpio(contacto.nombre)}\n${contacto.necesidad?limpio(contacto.necesidad)+'\n':''}\n*${t('referencia')}: ${datos.referencia}*`);setPreparado({clave,url});setAbierto(false);if(ventana&&!ventana.closed)ventana.location.assign(url);}catch{ventana?.close();setError(true);}finally{setOcupado(false);}
 }
 return <><button type="button" className={className} onClick={()=>{setError(false);setAbierto(true);}} disabled={ocupado}>{Icono?<Icono size={20} aria-hidden="true"/>:<IconoWhatsApp width={20} height={20}/>} {t(necesidad??etiqueta)}</button><DatosAsesoria abierto={abierto} cerrar={()=>setAbierto(false)} enviar={solicitar} ocupado={ocupado} error={error}/>{enlacePreparado&&<p className="asesoria-siguiente-paso"><a href={enlacePreparado} target="_blank" rel="noopener noreferrer">{t('abrirWhatsapp')}<span className="sr-only">{n('nuevaPestana')}</span></a></p>}</>;
}
