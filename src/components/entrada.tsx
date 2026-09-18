'use client';

import Image from 'next/image';
import { ArrowUpRight, Headset, Network, ShoppingBag } from 'lucide-react';
import { LazyMotion, MotionConfig, useMotionValue, useSpring, useReducedMotion, useMotionTemplate } from 'motion/react';
import * as m from 'motion/react-m';
import { useTranslations } from 'next-intl';
import { useState, type PointerEvent } from 'react';
import { Escenario } from './escenario';

const cargarAnimaciones = () => import('./movimiento').then(modulo => modulo.default);
const destinos = [
  { clave: 'tienda', href: '/tienda', Icono: ShoppingBag, foto: 'entrada-tienda' },
  { clave: 'soporte', href: '/soporte', Icono: Headset, foto: 'entrada-soporte' },
  { clave: 'empresas', href: '/empresas', Icono: Network, foto: 'entrada-empresas' },
] as const;

function TarjetaPortal({destino, indice, seleccionada, alSeleccionar}: {destino: typeof destinos[number]; indice: number; seleccionada: boolean; alSeleccionar: (indice: number) => void}) {
  const t = useTranslations('Entrada');
  const reducir = useReducedMotion();
  const giroX = useMotionValue(0), giroY = useMotionValue(0);
  const luzX = useMotionValue(50), luzY = useMotionValue(35);
  const rotacionX = useSpring(giroX, {stiffness: 105, damping: 24, mass: .7});
  const rotacionY = useSpring(giroY, {stiffness: 105, damping: 24, mass: .7});
  const brillo = useMotionTemplate`radial-gradient(350px circle at ${luzX}% ${luzY}%, rgba(192,222,246,.2), transparent 65%)`;
  const {clave, href, Icono, foto} = destino;
  function mover(evento: PointerEvent<HTMLAnchorElement>) {
    if (reducir || evento.pointerType !== 'mouse' || !matchMedia('(hover: hover) and (min-width: 900px)').matches) return;
    const rect = evento.currentTarget.getBoundingClientRect();
    const x = Math.max(0,Math.min(1,(evento.clientX-rect.left)/rect.width));
    const y = Math.max(0,Math.min(1,(evento.clientY-rect.top)/rect.height));
    giroX.set((.5-y)*2.4); giroY.set((x-.5)*2.4); luzX.set(x*100); luzY.set(y*100);
  }
  function restablecer() { giroX.set(0); giroY.set(0); }
  return <div className="portal-tarjeta-marco">
    <m.a href={href} className={`portal-tarjeta portal-${clave}`} data-activa={seleccionada}
      style={{rotateX: reducir ? 0 : rotacionX, rotateY: reducir ? 0 : rotacionY}}
      onPointerMove={mover} onPointerEnter={() => alSeleccionar(indice)} onPointerLeave={restablecer}
      onFocus={() => alSeleccionar(indice)} onBlur={restablecer}>
      <div className="portal-foto" aria-hidden="true"><Image src={`/imagenes/${foto}.webp`} alt="" fill sizes="(max-width: 899px) 350px, (max-width: 1400px) 33vw, 440px" priority={indice === 0}/></div>
      <div className="portal-velo" aria-hidden="true"/>
      <m.div className="portal-reflejo" style={{background: brillo}} aria-hidden="true"/>
      <div className="portal-tarjeta-cabecera" aria-hidden="true"><span className="portal-icono"><Icono size={20} strokeWidth={1.5}/></span></div>
      <div className="portal-tarjeta-contenido"><span className="portal-categoria">{t(`${clave}Categoria`)}</span><h2>{t(`${clave}Titulo`)}</h2><p>{t(`${clave}Texto`)}</p>
        <div className="portal-tarjeta-base"><span>{t(`${clave}Accion`)}</span><span className="portal-flecha" aria-hidden="true"><ArrowUpRight size={21}/></span></div>
      </div>
    </m.a>
  </div>;
}

export function Entrada() {
  const t = useTranslations('Entrada');
  const [activo, setActivo] = useState(-1);
  return <LazyMotion features={cargarAnimaciones} strict><MotionConfig reducedMotion="user">
    <section className="entrada portal" aria-labelledby="entrada-titulo">
      <div className="portal-atmosfera"><Escenario/></div>
      <div className="contenedor portal-interior">
        <div className="portal-presentacion">
          <p className="entrada-eyebrow"><span/>{t('descriptor')}</p>
          <h1 id="entrada-titulo">{t('titulo')}{' '}<br/><span>{t('acento')}</span></h1>
          <div className="portal-introduccion"><p>{t('descripcion')}</p></div>
        </div>
        <div className="portal-menu-cabecera"><span>{t('elegir')}</span></div>
        <nav className="portal-menu" aria-label={t('menu')} onPointerLeave={() => setActivo(-1)} onBlur={evento=>{if(!evento.currentTarget.contains(evento.relatedTarget as Node))setActivo(-1);}}>
          {destinos.map((destino, indice) => <TarjetaPortal key={destino.clave} destino={destino} indice={indice} seleccionada={activo===indice} alSeleccionar={setActivo}/>)}
        </nav>
      </div>
    </section>
  </MotionConfig></LazyMotion>;
}
