# Entrada interactiva implementada

9 de septiembre de 2026. Disponible en desarrollo local en http://127.0.0.1:3107. No publicada a producción.

> Actualización: la navegación por secciones fue reemplazada por páginas independientes con pestañas nuevas. Ver [estructura actual](08-referentes-y-paginas.md).

## Resultado

- Primera sección con tres enlaces reales: tienda (`/tienda`), soporte (`#contacto`) y empresas (`#servicios`). Los textos y etiquetas accesibles están en español e inglés.
- Identidad azul, logo blanco, acentos naranja, tarjetas con transiciones de Motion y apertura lateral del carrito.
- Escena 3D original de un procesador SG y módulos de conectividad. Responde al puntero y a la opción enfocada/seleccionada. No representa especificaciones de un producto del catálogo.
- Three.js se importa por separado cuando la escena está visible, en ventanas de al menos 900 px, sin ahorro de datos declarado ni preferencia de movimiento reducido. El primer intento se difiere 700 ms. Una ilustración SVG propia permanece visible mientras carga.
- Renderizado bajo demanda: el bucle termina cuando la interpolación se estabiliza. Los recursos se liberan al desmontar, salir de vista, ocultar la página o pausar; se reconstruyen al volver. Un botón permite pausar/reactivar. Ante indisponibilidad o pérdida de WebGL se conserva el respaldo estático.
- En móvil la ilustración aparece después del menú y no se carga Three.js. Las tres opciones caben completas en la ventana de prueba de 390 × 664. La navegación inicial funciona también sin JavaScript; esto no implica que todo el carrito funcione sin JavaScript.

## Ajuste de la investigación

Se instalaron Motion 13.2.0 y Three.js 0.186.0. Se utilizó Three.js directamente: al implementar, `npm view @react-three/fiber peerDependencies` informó que Fiber 9.7.0 exige React `>=19 <19.3`, mientras este proyecto tiene React 19.3.0. No se forzaron dependencias incompatibles ni se cambió React. La recomendación genérica de Fiber 9 con React 19 del documento de investigación debe entenderse con esta precisión.

Los controles de contenido administrativo siguen pendientes del módulo de ajustes. Esta entrega implementa el frontend y no modifica el estado de la pasarela de pago.

## Verificación

- TypeScript, ESLint, 190 claves bilingües y revisión heurística de secretos: correctos.
- Build de Next.js y OpenNext/Cloudflare, y 16 pruebas Playwright: correctos. Cubren escritorio/móvil, enlaces, idioma persistente, carrito, restricciones de acceso, carga/pausa/reactivación 3D, movimiento reducido, fallo de WebGL y navegación inicial sin JavaScript.
- Capturas de escritorio y móvil inspeccionadas en `evidencias/portada-escritorio.png` y `evidencias/portada-movil.png` (carpeta local ignorada por Git).
- Descarga observada en la prueba local: aproximadamente 1,09 MB en escritorio, incluyendo el 3D, y 0,60 MB en móvil. Ambas bajo el límite de regresión de 1,5 MB. Son recursos transferidos durante la prueba; no equivalen a una puntuación Lighthouse ni a métricas de usuarios reales.
- Auditoría npm tras instalar dependencias: 0 vulnerabilidades reportadas.

OpenNext mantiene la advertencia previa sobre middleware Node experimental; la renovación de sesión requiere validación con Supabase antes de producción.
