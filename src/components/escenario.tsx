'use client';

import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useReducedMotion } from 'motion/react';
import { Waves, Pause, Play } from 'lucide-react';

const Escena3D = lazy(() => import('./escena-3d'));

class RespaldoEscena extends Component<{children: ReactNode}, {fallo: boolean}> {
  state = {fallo: false};
  static getDerivedStateFromError() { return {fallo: true}; }
  render() { return this.state.fallo ? null : this.props.children; }
}

// La composición permanece visible sin WebGL, sin JavaScript y con movimiento reducido.
function Ilustracion() {
  return <svg viewBox="0 0 1240 560" preserveAspectRatio="xMidYMid slice" fill="none" className="escena-respaldo" aria-hidden="true">
    <defs>
      <linearGradient id="portal-luz" x1="610" y1="560" x2="910" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#4d6f91" stopOpacity="0"/><stop offset=".35" stopColor="#74b5e5"/><stop offset=".72" stopColor="#4d6f91"/><stop offset="1" stopColor="#4d6f91" stopOpacity="0"/></linearGradient>
      <linearGradient id="portal-naranja" x1="620" y1="500" x2="970" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#f05a28" stopOpacity="0"/><stop offset=".5" stopColor="#f05a28"/><stop offset="1" stopColor="#f05a28" stopOpacity="0"/></linearGradient>
      <filter id="portal-difuso"><feGaussianBlur stdDeviation="17"/></filter>
    </defs>
    <path d="M 600 560 C 870 340 680 240 960 -30" stroke="url(#portal-luz)" strokeWidth="95" opacity=".25" filter="url(#portal-difuso)"/>
    {Array.from({length: 5},(_,i) => <path key={i} d={`M ${600+i*13} 560 C ${860+i*18} 340 ${670+i*22} 240 ${950+i*15} -30`} stroke="url(#portal-luz)" strokeWidth={i === 2 ? 3 : 1} opacity=".6"/>)}
    <path d="M 655 560 C 885 270 750 240 960 -30" stroke="url(#portal-naranja)" strokeWidth="2" opacity=".7"/>
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
    <div className="escenario-controles"><span><Waves size={13}/>{t('visual')}</span>{permitido && !fallo && <button type="button" onClick={() => { setPausado(!pausado); setListo(false); }} aria-label={pausado ? t('activar') : t('pausar')}>{pausado ? <Play size={13}/> : <Pause size={13}/>}<span>{pausado ? t('activar') : t('pausar')}</span></button>}</div>
  </div>;
}
