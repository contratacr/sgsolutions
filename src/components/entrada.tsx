'use client';

import Image from 'next/image';
import { ArrowDown, ArrowUpRight, Headset, Network, ShoppingBag, ShieldCheck, MapPin, Mail, Navigation } from 'lucide-react';
import { LazyMotion, MotionConfig, useMotionValue, useSpring, useReducedMotion, useMotionTemplate } from 'motion/react';
import * as m from 'motion/react-m';
import { useTranslations } from 'next-intl';
import { useState, type PointerEvent } from 'react';
import { enlaceCorreo, empresa } from '@/lib/empresa';
import { Escenario } from './escenario';

const cargarAnimaciones = () => import('./movimiento').then(modulo => modulo.default);
const destinos = [
  { clave: 'tienda', href: '/tienda', Icono: ShoppingBag, foto: 'gamer' },
  { clave: 'soporte', href: '/soporte', Icono: Headset, foto: 'oficina' },
  { clave: 'empresas', href: '/empresas', Icono: Network, foto: 'red-hero' },
] as const;

function TarjetaPortal({destino, indice, alSeleccionar}: {destino: typeof destinos[number]; indice: number; alSeleccionar: (indice: number) => void}) {
  const t = useTranslations('Entrada');
  const reducir = useReducedMotion();
  const giroX = useMotionValue(0), giroY = useMotionValue(0);
  const luzX = useMotionValue(50), luzY = useMotionValue(35);
  const rotacionX = useSpring(giroX, {stiffness: 170, damping: 25});
  const rotacionY = useSpring(giroY, {stiffness: 170, damping: 25});
  const brillo = useMotionTemplate`radial-gradient(350px circle at ${luzX}% ${luzY}%, rgba(192,222,246,.2), transparent 65%)`;
  const {clave, href, Icono, foto} = destino;
  function mover(evento: PointerEvent<HTMLAnchorElement>) {
    if (reducir || evento.pointerType !== 'mouse' || !matchMedia('(hover: hover) and (min-width: 900px)').matches) return;
    const rect = evento.currentTarget.getBoundingClientRect();
    const x = Math.max(0,Math.min(1,(evento.clientX-rect.left)/rect.width));
    const y = Math.max(0,Math.min(1,(evento.clientY-rect.top)/rect.height));
    giroX.set((.5-y)*5); giroY.set((x-.5)*5); luzX.set(x*100); luzY.set(y*100);
  }
  function restablecer() { giroX.set(0); giroY.set(0); }
  return <div className="portal-tarjeta-marco">
    <m.a href={href} className={`portal-tarjeta portal-${clave}`}
      style={{rotateX: reducir ? 0 : rotacionX, rotateY: reducir ? 0 : rotacionY}}
      onPointerMove={mover} onPointerEnter={() => alSeleccionar(indice)} onPointerLeave={restablecer}
      onFocus={() => alSeleccionar(indice)} onBlur={restablecer}>
      <div className="portal-foto" aria-hidden="true"><Image src={`/imagenes/${foto}.webp`} alt="" fill sizes="(max-width: 899px) 350px, (max-width: 1400px) 33vw, 440px" priority={indice === 0}/></div>
      <div className="portal-velo" aria-hidden="true"/>
      <m.div className="portal-reflejo" style={{background: brillo}} aria-hidden="true"/>
      <div className="portal-tarjeta-cabecera" aria-hidden="true"><span className="portal-icono"><Icono size={20} strokeWidth={1.5}/></span><span className="portal-numero">0{indice+1}</span></div>
      <div className="portal-tarjeta-contenido"><span className="portal-categoria">{t(`${clave}Categoria`)}</span><h2>{t(`${clave}Titulo`)}</h2><p>{t(`${clave}Texto`)}</p>
        <div className="portal-tarjeta-base"><span>{t(`${clave}Accion`)}</span><span className="portal-flecha" aria-hidden="true"><ArrowUpRight size={21}/></span></div>
      </div>
    </m.a>
  </div>;
}

export function Entrada() {
  const t = useTranslations('Entrada');
  const [activo, setActivo] = useState(0);
  return <LazyMotion features={cargarAnimaciones} strict><MotionConfig reducedMotion="user">
    <section className="entrada portal" aria-labelledby="entrada-titulo">
      <div className="portal-atmosfera"><Escenario activo={activo}/></div>
      <div className="contenedor portal-interior">
        <div className="portal-presentacion">
          <p className="entrada-eyebrow"><span/>{t('descriptor')}</p>
          <h1 id="entrada-titulo">{t('titulo')}{' '}<br/><span>{t('acento')}</span></h1>
          <div className="portal-introduccion"><p>{t('descripcion')}</p><span><ShieldCheck size={16}/>{t('ayuda')}</span></div>
        </div>
        <div className="portal-menu-cabecera"><span>{t('elegir')}</span><span aria-hidden="true">01 — 03 <ArrowDown size={14}/></span></div>
        <nav className="portal-menu" aria-label={t('menu')} onPointerLeave={() => setActivo(0)}>
          {destinos.map((destino, indice) => <TarjetaPortal key={destino.clave} destino={destino} indice={indice} alSeleccionar={setActivo}/>)}
        </nav>
        <div className="portal-base"><a href="/nosotros">{t('explorar')}<ArrowUpRight size={16}/></a><div className="portal-ubicacion"><MapPin size={18}/><span>{t('encontrarnos')}<small>{t('ubicacion')}</small><span className="portal-mapas"><a href={empresa.mapa} target="_blank" rel="noopener noreferrer" title={t('nuevaPestana')}><MapPin size={13}/>{t('maps')}</a><a href={empresa.waze} target="_blank" rel="noopener noreferrer" title={t('nuevaPestana')}><Navigation size={13}/>{t('waze')}</a></span></span></div><a href={enlaceCorreo()} target="_blank" rel="noopener noreferrer" title={t('nuevaPestana')}><Mail size={18}/><span>{t('conversemos')}<small>{empresa.correo}</small></span></a></div>
      </div>
    </section>
  </MotionConfig></LazyMotion>;
}
