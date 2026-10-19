# Referencias de pedidos

Formato visible: `SG-0001`, `SG-0002`… El ancho mínimo es cuatro dígitos y crece sin truncar (`SG-10000`). Una secuencia de PostgreSQL asigna referencias, con independencia de la fecha, idioma, dispositivo o método de pago. No es el consecutivo de facturación electrónica: la factura sigue a cargo de GTI.

## Criterio

Shopify separa el identificador interno del nombre de pedido y permite un prefijo/sufijo sobre su número. Adoptamos ese patrón: referencia corta para atención al cliente y UUID para relaciones, autorización y pasarela.

Fuentes primarias consultadas el 19 de octubre de 2026:
- https://help.shopify.com/en/manual/intro-to-shopify/initial-setup/setup-business-settings
- https://shopify.dev/docs/api/admin-graphql/latest/objects/Order

## Migración

`20261019000100_referencias_pedidos.sql` añade una referencia por operación a solicitudes, pedidos manuales y tarjeta. Asigna los registros históricos en orden de creación (desempate por UUID). Incluye archivados, eliminados lógicamente y pruebas para no reutilizar una referencia. Conserva el `numero` anterior de las solicitudes y todos los UUID, tokens, estados, fechas, importes, comprobantes y transacciones. La búsqueda del panel admite las referencias anteriores.

La solicitud y su pedido vinculado conservan la misma referencia. Las tablas de pago incorporan `solicitud_asesoria_id`; el servidor lo obtiene de la aprobación ya autenticada, nunca de un número enviado por el navegador. Un trigger privado asigna e inmoviliza la referencia. Las secuencias pueden tener saltos por transacciones revertidas/concurrencia, sin reutilizar números.

El registro de referencias no contiene información del cliente y tiene RLS, sin acceso de clientes/anónimos. La nueva RPC `mis_pedidos_referencias` reutiliza la autorización y selección de `mis_pedidos`; la anterior permanece para compatibilidad. El número nunca concede acceso a un pedido. Los enlaces privados y `orderNumber` de Tilopay siguen usando el UUID.

Aplicar primero SQL y después el Worker. Las pantallas, correos nuevos y búsqueda usan `referencia_numero`. Los mensajes enviados anteriormente conservan su texto y su enlace. La copia anterior del Worker puede seguir funcionando con el esquema ampliado. No ejecutar la migración de nuevo una vez aplicada.

## Comprobaciones

- `node tests/sql/referencias-pedidos.mjs`: histórico intacto, orden determinista, conversión, altas múltiples, inmutabilidad y aislamiento por cuenta.
- `npx playwright test --config=playwright.referencias.config.ts`: panel, filtros, búsqueda nueva/anterior y escritorio/Safari móvil en ambos idiomas.
- `npx playwright test --config=playwright.confirmaciones.config.ts`: números y estados en los enlaces privados existentes.

El retiro pendiente de la adaptación de soporte se conserva en el checkout de diseño; no forma parte de esta publicación.
