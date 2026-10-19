# Archivo de compras sin pago y entrega Express

Revisión del reporte del 18 de octubre de 2026, implementada localmente el 19 de octubre.

## Causas reproducidas

1. La política de archivo de tarjeta exigía 24 horas para `iniciado`/`pendiente`, tanto en TypeScript como en PostgreSQL. Por eso una demostración reciente no mostraba la acción.
2. `siguientesEstadosEntrega()` permitía Express de `preparando` a `enviado`, pero `validar_estado_entrega()` solo lo permitía para `envio`; Express se trataba como retiro. La base rechazaba la operación y la página mostraba conflicto. La clasificación de `enviado` en Finalizados ya era correcta.

## Comportamiento corregido

- Archivo reversible desde el primer momento para pagos de tarjeta iniciados, pendientes, rechazados o con error. En pago manual, también revisión o pendiente de pago. Los comprobantes recibidos siguen requiriendo revisión; no se archivan pedidos pagados en preparación.
- Motivo interno obligatorio de 3 a 1000 caracteres para un nuevo archivo. No se exige retrospectivamente a archivos históricos. Se conserva al restaurar y no se incluye en el detalle/RPC del cliente.
- Archivo conserva pago, entrega, importes, UUID, referencias y enlaces. Un pago tardío confirmado devuelve la compra archivada a la bandeja activa y conserva la nota.
- El botón de contacto de una compra sin completar prepara un mensaje de ayuda con nombre y referencia. El idioma del mensaje sigue el del cliente; el botón sigue el del panel. WhatsApp abre en otra pestaña con atributos de seguridad. No hay envío automático ni tarea programada.
- Express avanza igual que envío normal: Preparando → Enviado → Entregado. Al marcar Enviado aparece en Finalizados, conservando la confirmación del pago. Retiro mantiene Listo para retiro.

## Base de datos y validación

La migración `20261019000200_pedidos_archivo_y_express.sql` debe aplicarse antes de publicar este bloque. Añade las notas y actualiza ambos validadores; conserva las políticas RLS y los permisos. No modifica estados de pedidos existentes ni presume que los tres pedidos del reporte ya se enviaron físicamente.

- `node tests/sql/pedidos-archivo-express.mjs` reproduce el rechazo original para un pago SINPE y dos de tarjeta en PostgreSQL efímero, aplica la corrección y comprueba archivo, restauración, pago tardío, notas y permisos.
- `npx playwright test --config=playwright.pedidos-bugs.config.ts` cubre los nuevos casos y los anteriores en escritorio/Safari móvil, ES/EN.

## Software bajo pedido

El 19 de octubre se verificó en la sesión autenticada de Intcomex Costa Rica el SKU **SE027MSE92**, Microsoft 365 Personal, 12 meses, 1 usuario, MPN **EP2-32316**. El precio de venta de **₡42.000 IVA incluido** sigue la fórmula vigente; el costo consultado queda solo en evidencia privada. Fuente: https://myservices.intcomex.com/en/XCR/store/detail/product/LCREKNO579267~CNREKNO579267~CNSKUSE027MSE92

- El usuario confirmó compra a Intcomex bajo pedido. **30 es el límite por pedido, no inventario propio ni disponibilidad exacta del proveedor.** El portal solo indica más de 20 unidades en El Coyol. No se reserva ni compra al proveedor automáticamente.
- Selección cerrada de un SKU en `catalogo-software.json`; no se permite el resto del catálogo legado Intcomex. Sobrevive a sincronización Eurocomp y respeta precio, descuento y despublicación del administrador.
- Imagen real existente contrastada con el modelo en Intcomex/1WorldSync, con registro de procedencia y coincidencia Microsoft/EP2-32316.
- Precio de venta público sin costo del proveedor; límite 30 en carrito, ficha, vista previa y servidor. Revalidación de precio y publicación antes de aprobar la compra y antes de crear el pedido.
- Compra solo de software: modalidad Digital, sin dirección ni envío físico. Compras mixtas mantienen las modalidades físicas existentes. El servidor rechaza una modalidad incompatible con los productos aprobados.
- Compra por SINPE/transferencia o tarjeta con el flujo existente. La entrega de la licencia se coordina manualmente por correo, después de confirmar pago y disponibilidad. Preparando → Entregado para pedidos digitales; no se entrega un código ni se compra automáticamente a Intcomex.
- `20261019000300_favorito_software.sql` permite guardar únicamente este SKU digital en favoritos, manteniendo registros y permisos existentes. Aplicar después de `20261019000200_pedidos_archivo_y_express.sql`, antes de publicar.

Validación dirigida: `npx playwright test -c playwright.software.config.ts`; catálogo, sincronización, despublicación, ES/EN, escritorio/Safari móvil, límite, precio manipulado, compras manuales y tarjeta **con proveedor simulado local**, importe sin envío y bloqueo de reutilización. El test SQL incluye entrega digital y restricción de favoritos. Las pruebas no cobran ni envían WhatsApp.

Las migraciones `20261019000200` y `20261019000300` se aplicaron en Supabase Producción el 19 de octubre de 2026. La comprobación posterior confirmó motivo en tres tablas, validación Express y digital, restricción de favoritos y conservación de los 20 pedidos reales y sus 15 pagos confirmados. No se modificaron estados de entrega reales ni se enviaron mensajes a clientes.

Antes de publicar se repitieron 24 pruebas de pedidos y 8 de software/catálogo en escritorio y Safari móvil, ES/EN: todas aprobadas. También pasaron SQL efímero, tipos, lint, textos y auditoría de dependencias de producción (sin vulnerabilidades).
