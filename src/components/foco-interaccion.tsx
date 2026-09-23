'use client';

import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {desplazarContenido} from '@/lib/desplazar-contenido';

// Some native controls retain :focus-visible after a pointer interaction.
// Hide only their decorative outline; keep native focus and keyboard behavior.
export function FocoInteraccion() {
  const ruta = usePathname();
  useEffect(() => {
    const raiz = document.documentElement;
    const puntero = () => { raiz.dataset.interaccion = 'puntero'; };
    const teclado = (evento: KeyboardEvent) => {
      if (!evento.metaKey && !evento.ctrlKey && !evento.altKey) {
        raiz.dataset.interaccion = 'teclado';
      }
    };
    document.addEventListener('pointerdown', puntero, true);
    document.addEventListener('keydown', teclado, true);
    const navegarSeccion = (evento: MouseEvent) => {
      const enlace = (evento.target as Element | null)?.closest<HTMLAnchorElement>('a[href*="#"]');
      if (!enlace || enlace.classList.contains('saltar') || evento.defaultPrevented || evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
      const destino = new URL(enlace.href, location.href);
      if (!destino.hash || destino.origin !== location.origin || destino.pathname !== location.pathname) return;
      const elemento = document.getElementById(decodeURIComponent(destino.hash.slice(1)));
      if (!elemento) return;
      evento.preventDefault();
      history.pushState(null, '', destino.hash);
      desplazarContenido(elemento);
    };
    document.addEventListener('click', navegarSeccion);
    return () => {
      document.removeEventListener('pointerdown', puntero, true);
      document.removeEventListener('keydown', teclado, true);
      document.removeEventListener('click', navegarSeccion);
      delete raiz.dataset.interaccion;
    };
  }, []);
  useEffect(() => {
    if (!location.hash) return;
    const id = decodeURIComponent(location.hash.slice(1));
    const frame = requestAnimationFrame(() => desplazarContenido(document.getElementById(id)));
    return () => cancelAnimationFrame(frame);
  }, [ruta]);
  return null;
}
