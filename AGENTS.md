# SG Solutions

- Todo cambio de interfaz debe incluir español e inglés: textos, accesibilidad, mensajes y metadatos. Mantener el selector de idioma en cada página y verificar la persistencia de la preferencia. Ejecutar `npm run verificar:textos`.
- La portada funciona como entrada a áreas independientes. Tienda, Soporte y Empresas tienen rutas propias y sus accesos desde el menú principal abren pestañas nuevas, según la preferencia del usuario. Usar enlaces reales con `target="_blank"`, `rel="noopener noreferrer"` y una indicación accesible traducida.
- Antes de entregar cambios, verificar las rutas afectadas en escritorio/móvil y ambos idiomas. Mantener `npm run verificar`, build y pruebas pertinentes.
- No desplegar a producción ni activar cobros reales sin autorización explícita del usuario.
