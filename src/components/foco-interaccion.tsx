'use client';

import {useEffect} from 'react';

// Some native controls retain :focus-visible after a pointer interaction.
// Hide only their decorative outline; keep native focus and keyboard behavior.
export function FocoInteraccion() {
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
    return () => {
      document.removeEventListener('pointerdown', puntero, true);
      document.removeEventListener('keydown', teclado, true);
      delete raiz.dataset.interaccion;
    };
  }, []);
  return null;
}
