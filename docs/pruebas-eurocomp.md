# Revisión local — 9 de octubre de 2026

## Resultado

250 pruebas distintas aprobadas entre la ronda general y las rondas específicas. La ronda general terminó con 190 aprobadas, cero fallos y 60 pruebas dependientes de opciones de entorno omitidas; esas 60 se ejecutaron posteriormente en los entornos correspondientes. Los primeros fallos por nombres, rutas, productos y requisitos de asesoría anteriores se actualizaron para comprobar el flujo vigente, conservando las verificaciones de seguridad. Un fallo de artefactos de Playwright por ejecuciones simultáneas se resolvió ejecutando las pruebas del panel en serie.

Cobertura: español e inglés, Chromium de escritorio y móvil, Safari/WebKit, navegación y persistencia de idioma, catálogo, filtros, marcas, fotos con respaldo, cantidades, carrito y aviso de agregado, formularios y errores, enlaces de compra, acceso y cierre de sesión, edición y publicación, proveedores, estadísticas, historial y cargas del panel.

Las tarjetas agregan una unidad. La ficha y el carrito tienen contador. Asesoría permanece como contacto opcional general. El catálogo incluye 1.469 productos publicados y uno en borrador por falta de imagen; se corrigieron 33 adaptadores de red anteriormente clasificados como accesorios. La regla distingue adaptadores de red de cargadores inalámbricos y hubs multifunción.

## Compra aislada

`node scripts/probar-compra-eurocomp.mjs` pasó con tres pedidos ficticios, seis correos simulados y un comprobante. Incluye una compra desde la interfaz móvil, envío de ₡4.000, cambio de stock o precio, doble envío, recuperación tras fallo de base de datos, fallo de correo sin perder el pedido, PDF falso, almacenamiento no disponible, comprobante duplicado, administración del pago y callback de tarjeta verificado por consulta simulada. No se enviaron correos ni se realizaron cobros u órdenes de proveedor reales.

Las tres migraciones nuevas se probaron en PostgreSQL aislado: publicación atómica, control de revisión, permisos públicos/privados, límite de frecuencia y origen de las sesiones internas de compra. No se aplicaron a producción.

## Rendimiento y seguridad

Build de producción servido localmente: 36 combinaciones de ruta, idioma y ancho, sin errores JavaScript ni desbordamientos. Tiempo hasta contenido visible entre 43 y 302 ms; máximo HTML 192.076 bytes. Es una medición local, no de latencia ni capacidad de Cloudflare en Internet. Se mantienen skeletons para cargas de contenido y estados de progreso en acciones.

Comprobaciones de tipos, lint, 1.281 claves bilingües, revisión heurística de secretos y build de Cloudflare aprobados. La búsqueda de las credenciales privadas reales de Eurocomp encontró cero coincidencias en los assets públicos. Se actualizaron Sharp, Wrangler y dependencias transitivas con correcciones disponibles. `npm audit` aún informa cinco entradas altas de desarrollo de la misma cadena de ESLint/braces, sin actualización compatible publicada; no se aplicó el downgrade de Next propuesto por `audit fix --force`.

## Pendiente fuera de la prueba local

Publicar los cambios y aplicar las migraciones; configurar secretos y activar la sincronización horaria de GitHub Actions; comprobar el despliegue contra Supabase y Brevo reales. Los cobros reales de tarjeta permanecen desactivados. No existe envío automático de órdenes o reservas a Eurocomp. Confirmar con Eurocomp el significado de la bodega 0 y posibles tasas/exenciones por artículo: el precio neto se comprobó contra la cuenta autenticada, pero SOAP no informa una tasa individual de IVA. Sigue pendiente una imagen verificable para el rollo Zebra 10043287.

## Regresión de timeout y conservación manual — 5 de noviembre de 2026

- `node tests/sql/eurocomp-publicacion.mjs`: migración sobre PostgreSQL efímero (PGlite), copia de 11 736 artículos, permisos, publicación atómica, rechazo de costos públicos, revisión obsoleta tras una reserva manual, conservación de precio/oferta/inventario y repetición idempotente tras otra venta. Una copia preparada por sí sola no cambia la tienda ni su fecha de publicación.
- `node --conditions=react-server --import tsx tests/integracion/eurocomp-publicacion.mts`: seis casos con transporte local simulado, incluidos `57014`, `55P03`, conflicto, respuesta perdida al preparar la copia, límite de tres intentos y errores no recuperables. Verifica que cada reintento relea cambios manuales y que precio/existencias de Eurocomp sí se actualicen.
- `playwright.eurocomp-manual.config.ts`: cuatro casos en PC/Safari móvil y español/inglés, con servicios ficticios; actualización, intervalo, fallo del proveedor, respuesta vacía y conflicto conservando el catálogo publicado.
- Se mantienen las pruebas de política de precios/stock y las de inventario manual; los nuevos bloques SQL/integración quedan en la regresión manual de GitHub Actions, sin añadir una regresión completa a cada push.
