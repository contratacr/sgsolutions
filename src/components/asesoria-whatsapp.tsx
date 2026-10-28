'use client';
import {useConfiguracionSitio} from '@/components/configuracion-sitio';
import {rutaProducto} from '@/lib/rutas-productos';
import {useSyncExternalStore} from 'react';
import {useLocale,useTranslations} from 'next-intl';
import {Wifi,Building2,ShieldCheck,Laptop} from 'lucide-react';
import {IconoWhatsApp} from './icono-whatsapp';
import {colones,traducir,type CatalogoPublico} from '@/lib/catalogo-modelo';

const suscribirOrigen=()=>()=>{};
export function AsesoriaWhatsApp({lineas=[],onSolicitar,className='boton boton-naranja',etiqueta='consultar',necesidad,detalle,texto}:{lineas?:{producto:CatalogoPublico['productos'][number];cantidad:number}[];onSolicitar?:()=>void;className?:string;etiqueta?:'consultar'|'asesorar'|'consultarSeleccion'|'confirmarExistencia'|'consultarOpciones';detalle?:string;texto?:string;necesidad?:'red'|'negocio'|'seguridad'|'computadora'}){
 const {enlaceWhatsApp}=useConfiguracionSitio();
 const Icono=necesidad?{red:Wifi,negocio:Building2,seguridad:ShieldCheck,computadora:Laptop}[necesidad]:null;
 const t=useTranslations('Asesoria'),n=useTranslations('Navegacion'),idioma=useLocale();
 const origen=useSyncExternalStore(suscribirOrigen,()=>location.protocol==='https:'?location.origin:'',()=>'');
 const limpio=(s:string)=>s.replace(/[\u0000-\u001f\u007f\u202a-\u202e*~`]/g,' ').replace(/\s+/g,' ').trim().slice(0,140);
 const disponibilidad=etiqueta==='confirmarExistencia';
 const productos=lineas.map(({producto:p,cantidad})=>[
  `*${disponibilidad?'':`${cantidad} × `}${limpio(traducir(p.nombre,idioma))}*`,
  p.codigoFabricante?`${t('codigo')}: ${limpio(p.codigoFabricante)}`:'',
  p.precio!==null?`${t('precioReferencia')}: ${colones(p.precio)}`:'',
  origen?`${origen}${rutaProducto(p)}`:''
 ].filter(Boolean).join('\n'));
 const mensaje=[t(disponibilidad?'mensajeDisponibilidadInicio':'mensajeInicio'),necesidad?t('mensajeNecesidad',{necesidad:t(necesidad)}):'',...(detalle?[limpio(detalle)]:[]),...productos,
  disponibilidad?t('mensajeDisponibilidadCierre'):lineas.length?t('mensajeCierre'):necesidad?'':t('mensajeGeneral')
 ].filter(Boolean).join('\n\n');
 return <a href={enlaceWhatsApp(mensaje)} target="_blank" rel="noopener noreferrer" className={className} onClick={onSolicitar}>{Icono?<Icono size={20} aria-hidden="true"/>:<IconoWhatsApp width={etiqueta==='confirmarExistencia'?19:20} height={etiqueta==='confirmarExistencia'?19:20} aria-hidden="true"/>} {etiqueta==='confirmarExistencia'?<span className="disponibilidad-etiqueta">{t(necesidad??etiqueta)}</span>:texto??t(necesidad??etiqueta)}<span className="sr-only">{n('nuevaPestana')}</span></a>;
}
