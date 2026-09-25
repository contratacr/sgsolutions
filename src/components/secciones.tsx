import Image from 'next/image';
import {SolicitudPlan} from './solicitud-plan';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowRight, ArrowUpRight, Headset, Network, ShieldCheck, Monitor, Check, MapPin, Phone } from 'lucide-react';
import { enlaceCorreo, enlaceWhatsApp, empresa } from '@/lib/empresa';

export async function Soluciones() {
  const t = await getTranslations('Inicio');
  const contacto = await getTranslations('Contacto');
  const iconos = [Headset, Network, ShieldCheck, Monitor];
  return <section id="servicios" className="seccion contenedor"><div className="encabezado-seccion"><div><p className="etiqueta">{t('serviciosEtiqueta')}</p><h2>{t('serviciosTitulo')}</h2></div><p>{t('serviciosDescripcion')}</p></div><div className="servicios-grid">{iconos.map((Icono,i) => <a key={i} className="servicio" id={`solucion-${i+1}`} href={enlaceWhatsApp(contacto('servicioMensaje', {servicio: t(`servicio${i}Titulo`)}))} target="_blank" rel="noopener noreferrer"><div className="servicio-icono"><Icono size={28}/><span>{`0${i+1}`}</span></div><h3>{t(`servicio${i}Titulo`)}</h3><p>{t(`servicio${i}Texto`)}</p><ArrowUpRight className="servicio-flecha" size={24}/><span className="sr-only">{t('servicioAccion')}</span></a>)}</div></section>;
}

export async function Proyectos() {
  const t = await getTranslations('Inicio');
  return <section className="seccion proyectos"><div className="contenedor"><p className="etiqueta">{t('proyectosEtiqueta')}</p><h2>{t('proyectosTitulo')}</h2><div className="proyectos-grid">{['camaras', 'pos'].map((imagen,i) => <article className="proyecto" key={imagen}><div className="proyecto-imagen"><Image src={`/imagenes/${imagen}.webp`} alt={t(i === 1 ? 'proyectoNegocioAlt' : 'proyecto0Alt')} fill sizes="(max-width: 760px) 100vw, 48vw"/></div><div><h3>{t(i === 1 ? 'proyectoNegocioTitulo' : 'proyecto0Titulo')}</h3><p>{t(i === 1 ? 'proyectoNegocioTexto' : 'proyecto0Texto')}</p></div></article>)}</div></div></section>;
}

export async function Planes() {
  const t = await getTranslations('Inicio');
  return <section id="planes" className="seccion contenedor"><div className="encabezado-seccion"><div><p className="etiqueta">{t('planesEtiqueta')}</p><h2>{t('planesTitulo')}</h2></div><p>{t('planesDescripcion')}</p></div><div className="planes-grid">{[0,1,2].map(i => <article className={`plan ${i===1 ? 'plan-destacado' : ''}`} key={i}><span className="plan-numero">{`0${i+1}`}</span>{i===1&&<span className="plan-recomendado">{t('planRecomendado')}</span>}<h3>{t(`plan${i}Nombre`)}</h3><p className="plan-frase">{t(`plan${i}Frase`)}</p><ul>{t(`plan${i}Detalle`).split(' · ').map(detalle => <li key={detalle}><Check size={17}/>{detalle}</li>)}</ul><SolicitudPlan indice={i}/></article>)}</div><p className="nota-planes">{t('planesNota')}</p></section>;
}

export async function InvitacionTienda() {
  const t = await getTranslations('Inicio');
  return <section className="tienda-invitacion"><div className="contenedor tienda-invitacion-grid"><div><p className="etiqueta etiqueta-clara">{t('tiendaEtiqueta')}</p><h2>{t('tiendaTitulo')}</h2><p>{t('tiendaTexto')}</p><Link className="boton boton-naranja" href="/tienda">{t('tiendaAccion')}<ArrowRight size={18}/></Link></div><div className="tienda-imagen"><Image src="/imagenes/portatil.webp" alt={t('tiendaAlt')} fill sizes="(max-width: 760px) 100vw, 45vw"/></div></div></section>;
}

export async function Nosotros() {
  const t = await getTranslations('Inicio');
  return <section id="nosotros" className="seccion contenedor nosotros"><div className="nosotros-imagen"><Image src="/imagenes/oficina.webp" alt={t('nosotrosAlt')} fill sizes="(max-width: 760px) 100vw, 45vw"/></div><div><p className="etiqueta">{t('nosotrosEtiqueta')}</p><h2>{t('nosotrosTitulo')}</h2><p>{t('nosotrosTexto')}</p><a className="enlace-azul" href={empresa.mapa} target="_blank" rel="noopener noreferrer"><MapPin size={19}/>{t('visitanos')}<ArrowUpRight size={18}/></a></div></section>;
}

export async function Contacto({porCorreo=false}:{porCorreo?:boolean}={}) {
  const t = await getTranslations('Inicio');
  const contacto = await getTranslations('Contacto');
  const whatsapp = enlaceWhatsApp(contacto('mensaje'));
  const marca = await getTranslations('Marca');
  return <section id="contacto" className="contacto"><div className="contenedor contacto-grid"><div><p className="etiqueta">{t('contactoEtiqueta')}</p><h2>{t('contactoTitulo')}</h2><p>{t('contactoTexto')}</p></div><div className="contacto-acciones"><a className="boton boton-naranja" href={porCorreo?enlaceCorreo():whatsapp} target="_blank" rel="noopener noreferrer">{t(porCorreo?'contactoCorreo':'contactoAccion')}<ArrowUpRight size={20}/></a><a className="enlace-azul" href={`tel:${empresa.telefono}`}><Phone size={18}/>{marca('telefono')}</a></div></div></section>;
}
