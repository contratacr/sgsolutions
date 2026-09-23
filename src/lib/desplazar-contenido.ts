export function desplazarContenido(elemento: HTMLElement | null, enfocar = false) {
  if (!elemento) return;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      if (enfocar) elemento.focus({ preventScroll: true });
      elemento.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "center",
        inline: "nearest",
      });
    }),
  );
}
