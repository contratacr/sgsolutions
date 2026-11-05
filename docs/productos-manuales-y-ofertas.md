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
