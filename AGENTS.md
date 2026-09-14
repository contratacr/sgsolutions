# SG Solutions

- Todo cambio de interfaz debe incluir español e inglés: textos, accesibilidad, mensajes y metadatos. Mantener el selector de idioma en cada página y verificar la persistencia de la preferencia. Ejecutar `npm run verificar:textos`.
- La navegación entre páginas de SG Solutions abre en la misma pestaña. WhatsApp, Outlook y mapas externos abren en otra pestaña con `rel="noopener noreferrer"` e indicación accesible traducida, según la última preferencia del usuario.
- Antes de entregar cambios, verificar las rutas afectadas en escritorio/móvil y ambos idiomas. Mantener `npm run verificar`, build y pruebas pertinentes.
- No desplegar a producción ni activar cobros reales sin autorización explícita del usuario.
- Mantener los cambios locales durante las iteraciones de diseño. No hacer push en cada cambio; agrupar entregas grandes y esperar indicación del usuario para publicar el siguiente bloque.
- El footer debe conservar el logo gráfico oficial (el mismo del navbar o una variante de color), nunca sustituirlo solo por texto.

- Logo principal confirmado por el usuario: versión roja y blanca de Downloads/IMG_0561.PNG; asset web optimizado en public/imagenes/logo-principal.png. Usarlo en cabecera y footer.

- Español costarricense con trato de usted, sin tuteo ni voseo en ninguna interfaz, mensaje o contenido. Mantener equivalencia en inglés.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
