export function desplazarContenido(elemento: HTMLElement | null, enfocar = false, posicion: 'centro' | 'contenido' = 'centro') {
  if (!elemento) return;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      if (enfocar) elemento.focus({ preventScroll: true });
      const comportamiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      const caja = elemento.getBoundingClientRect();
      if (posicion === 'contenido' || caja.height > innerHeight * .8) {
        const margen = posicion === 'contenido' ? Math.min(230, Math.max(150, innerHeight * .23)) : 28;
        window.scrollTo({top: scrollY + caja.top - margen, behavior: comportamiento});
      } else {
        elemento.scrollIntoView({behavior: comportamiento, block: 'center', inline: 'nearest'});
      }
    }),
  );
}
