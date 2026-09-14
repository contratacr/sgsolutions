# Identidad y ondas de luz

La portada reemplaza el procesador por ondas azules y una línea naranja como fondo decorativo, sin repetir el logo central. El mensaje principal propuesto por Isaac se presenta en dos líneas: «Somos su aliado tecnológico.»; en inglés, «We are your technology partner.». El descriptor es «Soluciones informáticas» / «IT Solutions». La redacción de las tarjetas de entrada acompaña el tratamiento de usted del slogan.

## Referencias consultadas

- [Unicorn Studio](https://www.unicorn.studio/): composición mediante efectos visuales y movimiento interactivo.
- [React Bits — Silk](https://reactbits.dev/backgrounds/silk): referencia de fondo abstracto animado.
- [Codrops Creative Hub](https://tympanus.net/codrops/hub/): exploración de ondas, luz e interacción con WebGL.
- [Spline Community](https://community.spline.design/): recurso disponible para explorar futuras escenas de marca.

Estos sitios sirven como referencias de diseño. El shader y el respaldo SVG de esta entrega son propios, no copias ni embeds de plantillas. No se incorporaron nuevas dependencias, modelos de terceros, cuentas ni servicios de pago.

## Comportamiento

Un plano con shader Three.js dibuja ondas continuas a un máximo aproximado de 30 cuadros por segundo. La posición de las ondas responde discretamente al puntero y la selección de área. El logo se concentra en la cabecera; el footer utiliza una firma tipográfica más discreta.

El efecto carga progresivamente en escritorio y se desmonta al salir de pantalla, ocultar la pestaña o pausar. Móvil, ahorro de datos, movimiento reducido y ausencia de WebGL conservan la composición SVG estática. La navegación funciona sin JavaScript y mantiene las áreas en pestañas independientes con la preferencia de idioma.

La animación sustituye el anterior renderizado bajo demanda: ahora existe movimiento lento mientras el efecto está habilitado y visible. Los documentos anteriores describen la implementación de su entrega, no este comportamiento actualizado.

## Verificación

263 claves bilingües, TypeScript, ESLint y builds Next/OpenNext correctos. Las 28 pruebas de navegador pasaron en escritorio y móvil. Las capturas de escritorio y móvil se guardan en `evidencias/` para revisión local. Se mantiene pendiente la validación de Supabase/Auth/RLS y la advertencia experimental del middleware Node de OpenNext. Sin publicación en producción.

## Accesos y jerarquía de marca

Los accesos a Tienda, Soporte y Empresas incorporan fotografías reales pequeñas, títulos, acciones visibles y flechas circulares. Tienda se diferencia con una superficie clara. En móvil se priorizan título y acción para mantener los tres destinos visibles. El foco de teclado tiene contorno naranja y el movimiento respeta la preferencia de accesibilidad.

Las iteraciones siguientes permanecen locales: se agruparán los cambios antes del próximo push, por indicación del usuario.
