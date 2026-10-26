# Revisión aislada de tienda y compra — 26 de octubre de 2026

Base: código publicado a39f42b. Autorización: probar tienda, compras y contactos sin gastar dinero real. No se publicó ningún cambio ni se modificaron anuncios o presupuestos durante esta revisión.

## Resultados

- Matriz principal: **80/80 aprobados**, Chromium de escritorio y WebKit iPhone, español e inglés. Incluye las 72 combinaciones de invitado/cuenta × retiro/Correos/Express × SINPE/transferencia/tarjeta, recuperación de precios y favoritos/vista previa/carrito.
- Revisión complementaria: **48/48 casos únicos aprobados**. Incluye persistencia del carrito, pasos y validaciones de compra, comprobantes, tarifas Express, aplicación/cancelación de filtros, contactos, sugerencias, protección de APIs y datos públicos.
- Catálogo y precios: **19/19 aprobados**.
- Conciliación: **18 escenarios aislados aprobados** (confirmación sin retorno, abandono, respuestas fallidas, importe/moneda/ambiente incorrectos, concurrencia, duplicados y reintentos).
- Pedidos y correos: **32 casos aprobados** de plazo/plantillas; además pasó la integración de retiro/envío/Express con tarjeta y pagos manuales en ambos idiomas, verificando importes del servidor, avisos y rechazo de datos inválidos.
- PostgreSQL efímero: pasó la migración de conciliación, preservación de filas, roles/permisos, reservas concurrentes y reintentos.
- Red del catálogo: **3/3 aprobados** (timeout, cancelación y HTTP fallido).
- Inventario de pruebas: **4/4 aprobados**. Tipos, lint, textos ES/EN, secretos, compilación y auditoría de assets públicos aprobados.

## Casos añadidos y ajustes

- Los contactos de WhatsApp, Outlook, redes y mapas abren en otra pestaña con protección y texto accesible traducido; el teléfono tiene un destino válido. Todos los destinos externos de este caso se sustituyen por páginas simuladas.
- Un formulario incompleto genera un único conteo de error, aunque tenga varios campos inválidos. No inicia pago ni verificación de compra.
- Una respuesta 503 de la pasarela conserva datos y carrito; permite reintentar. El doble clic del reintento produce una sola nueva solicitud.
- Abrir Términos y Privacidad y regresar conserva correo y modalidad de pago.
- Las pruebas anteriores del buscador ahora confirman la búsqueda con Enter; ya no asumen que escribir cambia inmediatamente el catálogo.
- Las sugerencias se comprueban con el alto real de cada viewport. Reducir el viewport no equivale a verificar un teclado físico de iOS.
- La nueva suite `revision-tienda` queda conectada a la regresión manual de GitHub; no se agregó ejecución automática por push.

En la primera ejecución complementaria pasaron 44 casos y fallaron cuatro por un selector nuevo ambiguo: encontraba la alerta visible y otra de un paso oculto. Se corrigió para seleccionar la alerta visible y los cuatro casos pasaron al repetirlos. No se contabilizan esos fallos como errores de compra del producto.

## Aislamiento y límites

Sin cargos, correos, mensajes ni pedidos de producción. Los pedidos de navegador viven en memoria; los servicios de servidor y PostgreSQL son efímeros y locales. No quedan ventas ficticias por eliminar en producción.

Tilopay y el transporte de correo se simularon. Esta ronda comprueba el comportamiento del código ante sus respuestas; no comprueba disponibilidad real de Tilopay, entrega real de correo ni aceptación bancaria. No se ejecutó el recorrido de Worker con Supabase local completo porque Docker no está instalado; se usaron las integraciones aisladas y PostgreSQL efímero descritos arriba.

Comandos reutilizables: `npx playwright test --config=playwright.compras-matriz.config.ts`, `npx playwright test --config=playwright.revision-tienda.config.ts`, `npx playwright test --config=playwright.catalogo.config.ts`. Solicitar autorización antes de futuras pruebas según AGENTS.md.
