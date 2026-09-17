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
    <defs><linearGradient id="orbita-azul" x1="760" y1="100" x2="1110" y2="420" gradientUnits="userSpaceOnUse"><stop stopColor="#d2e8ff"/><stop offset=".5" stopColor="#32608a"/><stop offset="1" stopColor="#82baf0"/></linearGradient><radialGradient id="nucleo"><stop stopColor="#e7f4ff"/><stop offset="1" stopColor="#39658c"/></radialGradient></defs>
    <g transform="translate(910 250)"><ellipse rx="158" ry="64" stroke="url(#orbita-azul)" strokeWidth="8" transform="rotate(-35)"/><ellipse rx="158" ry="64" stroke="#eb8148" strokeWidth="6" transform="rotate(40)"/><ellipse rx="158" ry="64" stroke="url(#orbita-azul)" strokeWidth="7" transform="rotate(100)"/><path d="M0 -55 49 -22 44 34 0 57 -48 24 -45 -30Z" fill="url(#nucleo)"/><path d="M0 -55 0 7 49 -22M0 7 44 34M0 7 -48 24M0 7 0 57" stroke="#c8e0f6" strokeOpacity=".5"/>{[[-120,80],[125,-80],[-66,-120],[76,116]].map(([cx,cy],i)=><circle key={i} cx={cx} cy={cy} r="9" fill={i%2?'#ec8956':'#b7d7ef'}/>)}</g>
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
