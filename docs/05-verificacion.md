# Verificación del arranque · 9 de septiembre de 2026

## Comprobado en esta máquina

| Verificación | Resultado |
| --- | --- |
| `tsc --noEmit` | Sin errores |
| ESLint | Sin errores ni advertencias tras corregir exportación de configuración |
| Catálogos | 592 claves en español e inglés; parámetros coincidentes |
| Detector de secretos | Sin coincidencias en archivos versionables; comprobación heurística |
| `npm audit --audit-level=low` | 0 vulnerabilidades tras actualizar/unificar sharp 0.35.4 |
| `next build` | Correcto, Next.js 16.3.4 / React 19.3.0 |
| Build OpenNext | Correcto; generado `.open-next/worker.js` |
| Worker local (Wrangler) | `/`, `/tienda`, `/acceso`: HTTP 200; `/panel`: 307 a `/acceso`; cabecera `nosniff` presente |
| Interacción en Worker local | Cambio persistente a inglés y agregar/abrir carrito correctos, sin errores de página |
| Playwright | 64 pruebas aprobadas en escritorio y móvil |
| Capturas | Portada, página completa y carrito generados; portada/escritorio y portada/carrito móvil inspeccionados visualmente |
| Transferencia inicial | Aproximadamente 961 KB escritorio / 603 KB móvil (bytes transferidos en loopback, incluida página/recursos) |
| JavaScript e imágenes | Sin errores de página, sin desborde horizontal; imágenes cargadas/decodificadas antes de captura completa |

Las pruebas de navegador cubren filtros, agregar/quitar productos, cantidades, persistencia tras recarga, solicitud de pedido y revisión antes de WhatsApp en español e inglés, entrega/retiro, códigos de fabricante, navegación móvil, denegación de panel sin configuración/sesión y rechazo de carrito manipulado en almacenamiento local. También verifican que la cinta de marcas se detenga al recibir foco. Las cifras de transferencia son una medición local, no Lighthouse ni resultados de red móvil real. Las capturas y mediciones JSON están en `evidencias/`, ignorado por Git.

## Fallos encontrados y tratamiento

- Instalación inicial: `4 high severity vulnerabilities`, derivadas de sharp en el árbol de herramientas. Se actualizó sharp a 0.35.4 y se verificó de nuevo: `found 0 vulnerabilities`.
- Compuerta de textos detectó valores técnicos de idioma (`es`/`en`) en atributos como texto visible. Se corrigió el recorrido del AST para distinguir contenido JSX de atributos técnicos; mantiene revisión de alt/título/etiquetas literales.
- Inicio local: `EADDRINUSE: address already in use 127.0.0.1:3000`. La primera ejecución de pruebas apuntó al servicio ajeno que ocupaba ese puerto y falló. Se detuvo esa ejecución sin modificar dicho servicio, se reservó 3107 para SG Solutions y se repitieron las 8 pruebas con éxito.
- Las primeras capturas tomaron una animación intermedia del carrito e imágenes diferidas fuera del viewport. Se ajustó la captura para finalizar animaciones y cargar/decodificar imágenes; se inspeccionaron capturas nuevas.
- Una comprobación adicional del Worker usó un nombre accesible de encabezado demasiado estricto y agotó el tiempo de espera. Se verificó directamente el idioma del documento; el cambio a inglés y el carrito funcionaron en la repetición.
- Git utilizaba una credencial sin acceso de escritura efectivo y devolvió HTTP 403. Al usar la conexión autenticada de `gh`, GitHub confirmó permisos de escritura, pero rechazó los workflows por falta de scope `workflow`. Los YAML se conservaron como plantillas en `docs/automatizaciones/`; activación pendiente de autorización de GitHub. La versión inicial permanece en una rama local de respaldo.

## No validado ni activado

Salida real de `npm run db:iniciar`:

```text
Supabase local no iniciado: falta Docker compatible instalado y en ejecución. No se intentó conectar a producción.
```

Por ello no se han aplicado/probado las migraciones ni RLS/Auth con usuarios reales o de prueba. No se enviaron correos, ejecutaron cobros, contrataron proveedores, crearon recursos cloud ni desplegaron Workers remotos. Workflows de migración/respaldo/despliegue quedan preparados y requieren cuentas, secretos, environments y autorización. Respaldos/restauración aún no ensayados.

OpenNext emitió una advertencia de soporte experimental de middleware Node en Cloudflare. Las rutas públicas y redirección sin sesión responden en Worker local; falta probar renovación de sesión Auth antes de producción. Las operaciones comerciales (clientes, cotizaciones, pedidos y edición administrativa) siguen pendientes según el plan.
