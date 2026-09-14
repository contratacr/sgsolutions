# Plan inicial · SG Solutions

## Objetivo y primera entrega
Una web que posicione a SG Solutions como integrador tecnológico cercano y profesional, una tienda con carrito/pagos y una herramienta interna de clientes/cotizaciones. Idiomas: español e inglés. Marca: azules del uniforme, naranja en acciones y logo blanco sobre oscuro. Ubicación física visible con foto, dirección y enlace a Maps.

**Arranque de este bloque:** preservar el repositorio existente, documentar arquitectura, montar Next.js 16 + React 19, catálogo bilingüe de textos, portada con fotos reales, tienda inicial con carrito, base de acceso del equipo, configuración Supabase local y workflows revisables. El carrito funciona con selección y cantidades; el cobro queda deshabilitado hasta contratar/configurar pasarela y cargar precios reales. No publicar a producción.

**Cierre de fase 1, en bloques posteriores:** administrador para crear/editar/publicar/retirar productos y ajustar contenido/contacto; pedidos y pago confirmado por proveedor; clientes con historial; cotizaciones con alcance, exclusiones, líneas, IVA, vigencia, descuento justificado, consecutivo, PDF, correo y seguimiento. No incluye contratos/SLA automatizados, cuentas por cobrar ni facturación electrónica integrada.

## Modelo propuesto
`auth.users` → `perfiles` (rol/estado). `clientes` → `cotizaciones` → `lineas_cotizacion`; historial y cola de correo asociados. `productos` → traducciones/precios/imágenes/existencias; `pedidos` → líneas/intentos de pago/eventos, con reservas de stock. `ajustes_publicos` y auditoría administrativa. Telemetría mínima en tablas separadas.

RLS en todas las tablas. Visitante solo lee catálogo publicado y ajustes públicos. Equipo activo accede al área comercial; solo administrador cambia catálogo/ajustes. Funciones controladas emiten cotizaciones y confirman pagos. Consecutivos no reutilizables, copias de datos al emitir y costos internos separados de PDF/correo. Detalle en `02-modelo-datos.md` y `04-tienda-pagos-y-admin.md`.

## Orden y criterios de entrega
1. Base visual/técnica: escritorio y móvil, inglés/español, carrito, WhatsApp, imágenes optimizadas, capturas inspeccionadas, medición de descarga y build de OpenNext.
2. Supabase local y administración: usuarios, roles, RLS, clientes, productos y ajustes. Verificar con cuentas de permisos distintos antes de abrir acceso real.
3. Comercio: precios/stock, pedidos y pasarela de prueba; validar cobros, rechazos, reintentos, reservas y webhooks idempotentes. Activar cobros reales tras contrato y autorización.
4. Cotizaciones y operación: cálculos/PDF/correo/seguimiento, migraciones por Actions con respaldo previo, respaldo diario cifrado, restauración ensayada y despliegue manual autorizado de `main`.

## Decisiones pendientes de Isaac
- Pasarela: comparar ONVO/Tilopay y consultar al banco del datáfono; aún no hay contrato de pago web. Confirmar CRC, USD o ambas: idioma y moneda son independientes.
- Productos vendibles, precios, stock, entrega/retiro, costos y condiciones de garantía/devolución; responsable de pedidos y emisión de facturas por sistema actual.
- Usuarios iniciales y permisos, reglas de descuento, consecutivo inicial, vigencia y aceptación de cotizaciones.
- Texto íntegro del documento: contiene frases cortadas sobre SLA, márgenes y validaciones. No fijar valores incompletos como reglas.
- Dominio final y ficha exacta de Maps; aprobación del contenido antes de producción.

## Cuentas y dependencias
GitHub disponible. Confirmar Cloudflare (Workers/R2/DNS), Supabase, Brevo, Resend y pasarela. Ingresar secretos en sus almacenes, nunca en chat/repo. Supabase local requiere Docker compatible encendido, actualmente ausente. Accesos detallados en `03-cuentas-y-operacion.md`.
