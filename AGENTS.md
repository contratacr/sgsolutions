# SG Solutions

- Todo cambio de interfaz debe incluir español e inglés: textos, accesibilidad, mensajes y metadatos. Mantener el selector de idioma en cada página y verificar la persistencia de la preferencia. Ejecutar `npm run verificar:textos`.
- La navegación entre páginas de SG Solutions abre en la misma pestaña. WhatsApp, Outlook y mapas externos abren en otra pestaña con `rel="noopener noreferrer"` e indicación accesible traducida, según la última preferencia del usuario.
- Antes de entregar cambios, verificar las rutas afectadas en escritorio/móvil y ambos idiomas. Mantener `npm run verificar`, build y pruebas pertinentes.
- La regresión completa se ejecuta únicamente de forma manual, cuando el usuario la solicite, en GitHub Actions con servicios aislados; no dispararla por cada push ni automáticamente antes de cada despliegue. Mantener las verificaciones rápidas de tipos, lint, textos, secretos y dependencias en push/PR, además de las pruebas pertinentes al cambio. Después del push autorizado, comprobar los checks del commit y corregir fallos antes de desplegar. No afirmar que una regresión o CI pasó sin verificar su resultado.
- Después de desplegar, usar `SG_PRODUCCION_SMOKE=1 npm run test:produccion:smoke` (seis consultas de lectura). No ejecutar la regresión completa contra producción; ampliar solo una comprobación dirigida si el smoke detecta un problema. Mantener los controles de secretos, assets públicos y dependencias.
- Al importar o modificar productos, ejecutar `npm run verificar:imagenes` contra el catálogo actualizado (`SG_CATALOGO_URL`). No usar imágenes generadas ni de otro modelo. Conservar fuente y coincidencia de marca/código en el registro de fotos verificadas. Ante fallos, corregir la foto o ejecutar `npm run verificar:imagenes -- --registrar-fallos` para dejarla pendiente de publicación; repetir la auditoría antes de publicar.
- No desplegar a producción ni activar cobros reales sin autorización explícita del usuario.
- Preferencia explícita del usuario: cuando diga «pushea», hacer push y desplegar ese bloque a producción, con las verificaciones correspondientes. Esta autorización no incluye activar cobros reales.
- Mantener los cambios locales durante las iteraciones de diseño. No hacer push en cada cambio; agrupar entregas grandes y esperar indicación del usuario para publicar el siguiente bloque.
- El footer debe conservar el logo gráfico oficial (el mismo del navbar o una variante de color), nunca sustituirlo solo por texto.

- Logo principal confirmado por el usuario: versión roja y blanca de Downloads/IMG_0561.PNG; asset web optimizado en public/imagenes/logo-principal.png. Usarlo en cabecera y footer.

- Español costarricense con trato de usted, sin tuteo ni voseo en ninguna interfaz, mensaje o contenido. Mantener equivalencia en inglés.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
