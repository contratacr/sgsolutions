'use client';

import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useReducedMotion } from 'motion/react';
import { Layers3, Pause, Play } from 'lucide-react';

const Escena3D = lazy(() => import('./escena-3d'));

class RespaldoEscena extends Component<{children: ReactNode}, {fallo: boolean}> {
  state = {fallo: false};
  static getDerivedStateFromError() { return {fallo: true}; }
  render() { return this.state.fallo ? null : this.props.children; }
}

// Geometría vectorial propia: también visible antes de cargar WebGL y sin JavaScript.
function Ilustracion() {
  return <svg viewBox="0 0 600 330" fill="none" className="escena-respaldo" aria-hidden="true">
    <defs>
      <linearGradient id="metal-sg" x1="130" y1="60" x2="430" y2="280" gradientUnits="userSpaceOnUse"><stop stopColor="#7399bf"/><stop offset="1" stopColor="#203d5b"/></linearGradient>
      <radialGradient id="halo-sg"><stop stopColor="#4d6f91" stopOpacity=".35"/><stop offset="1" stopColor="#4d6f91" stopOpacity="0"/></radialGradient>
    </defs>
    <ellipse cx="300" cy="195" rx="275" ry="130" fill="url(#halo-sg)"/>
    <ellipse cx="300" cy="211" rx="225" ry="76" stroke="#6a8cac" strokeOpacity=".25"/>
    <ellipse cx="300" cy="211" rx="196" ry="59" stroke="#f05a28" strokeOpacity=".6" strokeDasharray="280 600" transform="rotate(-10 300 211)"/>
    <path d="m155 205 145-77 145 77-145 80z" fill="#102a43" stroke="#345675"/>
    <path d="m155 191 145-77 145 77-145 80z" fill="#345675" stroke="#688aab"/>
    <path d="m182 168 118-62 118 62v21l-118 64-118-64z" fill="#162f48" stroke="#527392"/>
    <path d="m182 168 118-62 118 62-118 64z" fill="url(#metal-sg)" stroke="#88a6c3"/>
    <path d="m224 157 76-40 76 40-76 41z" fill="#142c44" stroke="#f05a28" strokeWidth="2"/>
    <g transform="matrix(.65 -.34 .65 .34 250 160)"><image href="/imagenes/logo-blanco.png" width="85" height="36"/></g>
    <path d="m95 151 34-18 34 18v31l-34 18-34-18z" fill="#2f4e73" stroke="#688aab"/><path d="m95 151 34 18 34-18m-34 18v31" stroke="#688aab"/>
    <path d="m435 116 25-14 25 14v24l-25 14-25-14z" fill="#f05a28"/><path d="m435 116 25 14 25-14m-25 14v24" stroke="#ffb693"/>
    <path d="m384 251 27-15 27 15v25l-27 15-27-15z" fill="#2f4e73" stroke="#688aab"/><path d="m384 251 27 15 27-15m-27 15v25" stroke="#688aab"/>
    <path d="m163 169 31 17m224-34 20-12M370 231l21 12" stroke="#f05a28" strokeDasharray="3 5"/>
    <circle cx="205" cy="245" r="4" fill="#f05a28"/><circle cx="398" cy="99" r="3" fill="#88a6c3"/>
  </svg>;
}

export function Escenario({activo}: {activo: number}) {
  const t = useTranslations('Entrada');
  const reducir = useReducedMotion();
  const contenedor = useRef<HTMLDivElement>(null);
  const punteroRef = useRef<[number, number]>([0, 0]);
  const invalidarRef = useRef<() => void>(() => {});
  const [permitido, setPermitido] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [listo, setListo] = useState(false);
  const [fallo, setFallo] = useState(false);
  useEffect(() => {
    const consulta = matchMedia('(min-width: 900px)');
    let visible = false;
    let temporizador: ReturnType<typeof setTimeout>;
    const actualizar = () => {
      clearTimeout(temporizador);
      const ahorro = (navigator as Navigator & {connection?: {saveData?: boolean}}).connection?.saveData;
      if (visible && consulta.matches && !document.hidden && !reducir && !ahorro) {
        temporizador = setTimeout(() => setPermitido(true), 700);
      } else { setPermitido(false); setListo(false); }
    };
    const observador = new IntersectionObserver(([entrada]) => { visible = entrada.isIntersecting; actualizar(); });
    if (contenedor.current) observador.observe(contenedor.current);
    consulta.addEventListener('change', actualizar);
    document.addEventListener('visibilitychange', actualizar);
    return () => { clearTimeout(temporizador); observador.disconnect(); consulta.removeEventListener('change', actualizar); document.removeEventListener('visibilitychange', actualizar); };
  }, [reducir]);
  const alCargar = useCallback(() => setListo(true), []);
  const alFallar = useCallback(() => { setFallo(true); setListo(false); }, []);
  const habilitado = permitido && !pausado && !fallo;
  return <div className="escenario" ref={contenedor} data-respaldo={fallo ? 'fallo' : 'normal'} data-escena={habilitado && listo ? '3d' : 'ilustracion'}
    onPointerMove={evento => { if (evento.pointerType !== 'mouse') return; const rect = evento.currentTarget.getBoundingClientRect(); punteroRef.current = [(evento.clientX-rect.left)/rect.width-.5, (evento.clientY-rect.top)/rect.height-.5]; invalidarRef.current(); }}
    onPointerLeave={() => { punteroRef.current = [0, 0]; invalidarRef.current(); }}>
    <div className={`escena-grafico ${habilitado && listo ? 'escena-lista' : ''}`} aria-hidden="true">
      <Ilustracion/>
      {habilitado && <RespaldoEscena><Suspense fallback={null}><Escena3D activo={activo} punteroRef={punteroRef} invalidarRef={invalidarRef} alCargar={alCargar} alFallar={alFallar}/></Suspense></RespaldoEscena>}
    </div>
    <div className="escenario-controles"><span><Layers3 size={13}/>{t('visual')}</span>{permitido && !fallo && <button type="button" onClick={() => { setPausado(!pausado); setListo(false); }} aria-label={pausado ? t('activar') : t('pausar')}>{pausado ? <Play size={13}/> : <Pause size={13}/>}<span>{pausado ? t('activar') : t('pausar')}</span></button>}</div>
  </div>;
}
