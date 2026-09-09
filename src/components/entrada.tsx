'use client';

import Link from 'next/link';
import { ArrowDown, ArrowUpRight, Headset, Network, ShoppingBag, ShieldCheck, MapPin } from 'lucide-react';
import { LazyMotion, MotionConfig } from 'motion/react';
import * as m from 'motion/react-m';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Escenario } from './escenario';

const cargarAnimaciones = () => import('./movimiento').then(modulo => modulo.default);
const destinos = [
  { clave: 'tienda', href: '/tienda', Icono: ShoppingBag },
  { clave: 'soporte', href: '/soporte', Icono: Headset },
  { clave: 'empresas', href: '/empresas', Icono: Network },
] as const;

export function Entrada() {
  const t = useTranslations('Entrada');
  const [activo, setActivo] = useState(0);
  return <LazyMotion features={cargarAnimaciones} strict><MotionConfig reducedMotion="user">
    <section className="entrada" aria-labelledby="entrada-titulo">
      <div className="entrada-trama" aria-hidden="true"/>
      <div className="contenedor entrada-grid">
        <div className="entrada-presentacion">
          <p className="entrada-eyebrow"><span/>{t('etiqueta')}</p>
          <h1 id="entrada-titulo">{t('titulo')}<br/><span>{t('acento')}</span></h1>
          <p className="entrada-descripcion">{t('descripcion')}</p>
        </div>
        <div className="entrada-destinos">
          <div className="entrada-menu-titulo"><span>{t('elegir')}</span><span aria-hidden="true">01 — 03</span></div>
          <nav aria-label={t('menu')} className="entrada-menu" onMouseLeave={() => setActivo(0)}>
            {destinos.map(({clave, href, Icono}, indice) => <m.div key={clave} whileHover={{y: -3}} whileTap={{scale: .99}} transition={{duration: .2}}>
              <Link href={href} target="_blank" rel="noopener noreferrer" title={t('nuevaPestana')} className={`destino destino-${clave}`} onPointerEnter={() => setActivo(indice)} onFocus={() => setActivo(indice)}>
                <div className="destino-superior"><span className="destino-icono"><Icono size={24} strokeWidth={1.5}/></span><span className="destino-numero">{`0${indice+1}`}</span></div>
                <div className="destino-contenido"><div><h2>{t(`${clave}Titulo`)}</h2><p>{t(`${clave}Texto`)}</p></div><ArrowUpRight className="destino-flecha" size={23}/></div>
                <span className="destino-accion">{t(`${clave}Accion`)}<span className="sr-only">{t('nuevaPestana')}</span><span aria-hidden="true"> →</span></span>
              </Link>
            </m.div>)}
          </nav>
          <p className="entrada-ayuda"><ShieldCheck size={15}/>{t('ayuda')}</p>
        </div>
        <div className="entrada-visual"><Escenario activo={activo}/><div className="entrada-visual-pie"><span className="entrada-indicador"/>{t('escena')}<span className="entrada-coordenadas" aria-hidden="true">{t('identificador')}</span></div></div>
      </div>
      <div className="contenedor entrada-base"><a href="/nosotros" target="_blank" rel="noopener noreferrer" title={t('nuevaPestana')}>{t('explorar')}<ArrowDown size={16}/></a><span><MapPin size={14}/>{t('ubicacion')}</span></div>
    </section>
  </MotionConfig></LazyMotion>;
}
