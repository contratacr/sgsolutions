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
