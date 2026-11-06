# Productos manuales, destacados y ofertas

## Administración

En Productos, **Agregar producto** crea un borrador independiente con identificador `manual-…` y origen explícito `manual`. Complete nombre y descripción en español e inglés, categoría, marca/código, imagen y disponibilidad. Guardar no implica publicar: se debe marcar Publicado. Sin una fotografía utilizable el producto no se incluye en el catálogo público.

Los manuales no representan existencias del proveedor. Seleccione consultar, bajo pedido o agotado según la operación real; no se declara inventario físico que no esté controlado.

Destacado da visibilidad en Recomendados sin alterar precio o disponibilidad. Es independiente de una oferta.

## Precios y horario

- Precio normal final en colones, con IVA incluido.
- Precio de oferta positivo, entero y menor que el normal.
- Inicio y fin opcionales, introducidos siempre en hora de Costa Rica (UTC−6), aunque el equipo esté en otra zona. Se guardan como instantes UTC.
- Sin inicio: inmediata. Sin fin: indefinida hasta retirar la oferta.
- Inicio inclusivo y fin exclusivo. Si se indican ambos, fin debe ser posterior al inicio.
- Borrar el precio de oferta borra también las fechas.
- Al finalizar, vuelve automáticamente el precio normal. No se acumula otro descuento sobre el rebajado.

Las fechas se evalúan al leer el catálogo y al verificar una compra. Los snapshots públicos conservan los datos comerciales mínimos de la promoción para poder reevaluarlos sin publicar de nuevo ni depender de un cron. No contienen costos ni márgenes privados. Una pestaña abierta puede conservar el precio que cargó: si cambia o vence antes de comprar, el servidor rechaza ese precio desactualizado, en lugar de cobrarlo silenciosamente.

## Sincronización

Eurocomp mantiene actualizados costo y existencias. Conserva datos editoriales, destacado, precio de oferta y fechas; los productos manuales y sus categorías no se eliminan. Los registros antiguos sin origen manual explícito siguen excluidos.

Al editar el precio normal se marca su protección. La opción **Conservar este precio normal al sincronizar el proveedor** permite volver al cálculo del proveedor en la próxima sincronización si se desmarca. Incluso con precio protegido, la disponibilidad se verifica contra el proveedor antes de comprar. Un descuento que deja de ser menor al nuevo precio normal no se aplica.

Se conservan los controles de sesión administrativa, MFA y revisión esperada al guardar: la sincronización concurrente no puede sobrescribir silenciosamente una edición.

## Publicación y pruebas

La migración `20261104000100_favoritos_manuales.sql` admite identificadores manuales en favoritos, sin cambiar las políticas RLS existentes. Debe aplicarse junto con este bloque antes de publicarlo.

Cobertura dirigida: creación y persistencia desde el panel en ES/EN y PC/móvil, precio en ficha/carrito, calendario en sus límites, snapshots, sincronización, validación de compra contra manipulación/agotado/despublicación, y favoritos con aislamiento entre cuentas. Las compras de prueba no usan servicios externos ni crean pedidos reales.

## Prioridad comercial y estabilidad del listado

Toda oferta válida y vigente tiene prioridad automática en Recomendados, sin una casilla adicional. Al vencer o retirar el descuento deja de priorizarse. En búsqueda se conserva primero la relevancia; las restricciones de categoría, marca y precio siguen aplicándose. Menor/mayor precio conserva su criterio explícito. Los bloques empresariales no desplazan las ofertas al encabezado del catálogo. El campo histórico `ofertaPrioritaria` se tolera por compatibilidad, pero ya no controla el orden.

Las fechas se pueden editar antes de indicar el precio de oferta. El editor nativo conserva en el navegador sus segmentos incompletos, sin borrarlos al escribir; solo comunica fechas completas al modelo. Guardar comprueba su validez nativa antes de persistir para evitar guardar silenciosamente el valor anterior. Si se introducen fechas, al guardar debe existir un precio de oferta válido.

El listado principal ya no incorpora historial ni favoritos al hidratarse: el orden del servidor y del navegador es el mismo. La personalización se mantiene en los bloques separados. Las fichas conservan los productos similares calculados para esa ficha, sin sustituirlos después de cargar el historial. Al navegar a otra ficha se adopta su nueva selección antes de pintar las tarjetas anteriores.

Al cambiar realmente de búsqueda, filtro, orden o página se muestra un skeleton hasta recibir el resultado completo, en lugar de pintar tarjetas de la selección anterior. Las solicitudes obsoletas se cancelan y no reemplazan resultados más recientes. Las actualizaciones del snapshot del servidor se incorporan antes de pintar la lista anterior. Volver a una pestaña mantiene la actualización del catálogo y cambia el conjunto de datos de manera atómica.

Pruebas dirigidas en `playwright.catalogo-estable.config.ts`: prioridad, primera carga y regreso desde ficha, solicitudes demoradas y respuestas fuera de orden, paginación, filtros, menús de orden, controles de tarjetas y carga conjunta de favoritos. Se ejecutan en escritorio y WebKit móvil, español e inglés, con servicios aislados. Este bloque se añade únicamente al workflow manual.

## Guardado y publicación — 5 de noviembre de 2026

El panel abre en Todos, incluidos los borradores. Guardar un borrador conserva el producto pero no lo publica; la confirmación lo indica explícitamente. La fila muestra Borrador incluso si además falta una imagen. La publicación manual se rechaza antes de guardar si el producto quedaría excluido del catálogo público por imagen pendiente o duplicación de un modelo empresarial. Esta validación existe también en el servidor.

El editor conserva el snapshot normalizado que aceptó el servidor, incluidas sus rutas estables. Cambiar el nombre después del primer guardado ya no reasigna inadvertidamente la URL. Solo se confirma el éxito al recibir la revisión esperada; los conflictos mantienen la edición sin sobrescribir el catálogo.

Verificación: ocho recorridos de navegador (productos nuevos, borrador, foto subida, recarga, publicación, búsqueda, ficha, segundo guardado, conflicto y carrito; PC/WebKit móvil, ES/EN), ocho casos del modelo manual y prueba SQL aislada de persistencia privada/pública, revisión y conflicto con MFA. Todos aprobados. La inspección de producción fue de solo lectura: se encontraron dos registros manuales Lenovo como borradores. No se publicaron, eliminaron ni crearon productos de prueba en producción.

## Existencias propias — implementación local, 5 de noviembre de 2026

- En productos manuales, “Controlar existencias propias” habilita `stockManual`: unidades disponibles para nuevas ventas, excluidas las ya reservadas. Los productos nuevos empiezan en cero. Desactivarlo permite venta bajo pedido; los productos anteriores conservan su modalidad hasta que se configure inventario.
- Ficha, vista rápida y carrito limitan cantidades; el contador de la ficha muestra las unidades disponibles. El servidor vuelve a comprobarlas. La tienda, sugerencias, recomendaciones y API de catálogo omiten los productos manuales con cero unidades. Al reponerlos vuelven a aparecer si siguen publicados.
- La migración `20261105000100_inventario_manual.sql` crea un registro privado de reservas y triggers transaccionales en los pedidos bancarios y de tarjeta. Se reserva antes de iniciar Tilopay o enviar avisos del pedido. Si faltan unidades, se revierte toda la inserción y la API devuelve `catalogo_actualizado` (409).
- Reserva y guardado del catálogo comparten el bloqueo 903107 y la revisión. Una venta invalida un editor o sincronización que tenga una copia anterior, impidiendo restaurar existencias accidentalmente. No se puede eliminar un producto ni desactivar su inventario mientras tenga reservas activas.
- SINPE/transferencia: reserva de 24 horas sin comprobante; con comprobante se mantiene para revisión administrativa. Cancelar o archivar un pedido pendiente libera sus unidades una sola vez. Un pago confirmado consume la reserva sin volver a descontarla.
- Tarjeta: mientras Tilopay no confirme la revocación/caducidad del enlace, la reserva no vence por reloj, ni se libera automáticamente por un error o rechazo que permita reintentar. Se resuelve mediante pago o archivo administrativo revisado. No se inventó una API de cancelación de Tilopay. Los pedidos sandbox no alteran el inventario real.
- Un pago real posterior a una liberación se conserva como pagado. Intenta reasignar unidades; si faltan, `inventario_alerta` bloquea avanzar la entrega y muestra una advertencia en el panel. Tras reponer existencias, un administrador con MFA puede pulsar “Reintentar asignación de existencias”. El sistema solo quita la alerta cuando consigue reservar todas las líneas pendientes.
- El procesador privado programado ejecuta la liberación de reservas bancarias vencidas. La creación/actualización de pedidos también limpia vencimientos bajo el mismo bloqueo. El carrito por sí solo nunca reserva unidades.
- SQL local con PGlite: aplicación de la migración y triggers existentes de archivo/entrega, reservas que compiten por la última unidad, rechazo atómico, duplicados, pago idempotente, cancelación, archivo, expiración, comprobante, pago tardío, resolución con reposición, sandbox, revisiones y permisos.
- Navegador aislado: PC y Safari móvil, español e inglés; edición de unidades, límite de ficha/carrito, solicitudes HTTP rechazadas por exceso, desaparición en cero, reposición y regresión de creación/ofertas/guardado. Sin cargos, correos ni cambios en producción.

Publicación autorizada el 5 de noviembre de 2026: migración aplicada antes del despliegue del código. Se conservan las cantidades reales existentes; los productos manuales anteriores requieren configurar sus unidades disponibles.
