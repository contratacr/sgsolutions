# Pedidos por SINPE Móvil y transferencia

El recorrido se inspira en la secuencia pública de Unimart: carrito, datos de entrega, método de pago, completar orden y recibir un número de pedido. Unimart indica que confirma SINPE automáticamente y pide enviar por correo el comprobante de transferencia junto con el número de pedido. SG Solutions todavía no tiene una integración bancaria para confirmar SINPE; por eso **ningún comprobante marca un pedido como pagado**.

Fuentes: [cómo realizar una compra](https://www.unimart.com/pages/como-realizar-una-compra), [formas de pago](https://www.unimart.com/pages/formas-de-pago) y [alerta del BCCR sobre comprobantes falsificados](https://www.bccr.fi.cr/comunicacion-y-prensa/Docs_Comunicados_Prensa/CP-BCCR-026-2021-Alerta_intentos_estafas_timo_basado_Sinpe_Movil.pdf).

## Flujo propuesto

1. El cliente proporciona sus datos al solicitar asesoría. El asesor acuerda los productos y habilita un enlace privado de compra.
2. Al completar la compra, el servidor valida esa aprobación y fija precios y entrega (Correos de Costa Rica: ₡4.000). Guarda el pedido como **pendiente de pago**, visible en **Panel → Pedidos → SINPE y transferencias**. Intenta enviar confirmación al cliente y aviso al equipo. Fallar el correo no elimina el pedido.
3. El cliente puede adjuntar un JPG, PNG o PDF de hasta 5 MB durante la compra o después desde su enlace privado. Se guarda en un bucket privado y el pedido pasa a **comprobante recibido**. Una carga fallida conserva el pedido y permite reintentar el archivo.
4. El administrador comprueba el ingreso bancario y marca **pago verificado**. La captura por sí sola nunca confirma el pago. Se intenta enviar confirmación del pago.
5. El equipo emite la factura en GTI y la envía desde GTI al correo de facturación. El panel facilita el acceso a GTI, pero no hay integración API ni emisión automática desde la app.
6. El panel permite reenviar el correo de estado del pedido. Esto no reemite facturas ni modifica el pago. La aceptación del correo por el proveedor no acredita su entrega en la bandeja del cliente.

El panel muestra los 50 pedidos manuales más recientes junto a los de tarjeta. SINPE y transferencia no pasan por Tilopay.

## Configuración antes de activar

- Aplicar `20260930000200_pedidos_manuales.sql` al proyecto correcto de Supabase. La migración crea una tabla con RLS y un bucket de comprobantes privado.
- Configurar de forma privada `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PEDIDOS_ENLACE_SECRET` (aleatorio, mínimo 32 caracteres), `PEDIDOS_ORIGEN_PUBLICO` (origen HTTPS del sitio) y, para correo, `BREVO_API_KEY` y `BREVO_REMITENTE` verificado.
- Tras probar el flujo de compra, correo, comprobante, revisión bancaria simulada y estados en el entorno correspondiente, definir `PEDIDOS_MANUALES_ACTIVOS=1`. Sin esta marca, el checkout no permite finalizar el pedido manual. No publicar secretos en Git.
- En `SG_ENTORNO=local`, la aplicación solo acepta un Supabase local y el origen `http://127.0.0.1:3107`. En `SG_ENTORNO=test` puede usar el Supabase de pruebas con ese origen para pruebas integradas. El envío real de correos se mantiene desactivado en ambos entornos.

El 30/9/2026 se aplicó la migración al proyecto **SG Solutions Pruebas Tilopay** y se probó la creación de un pedido, rechazo de un enlace inválido, rechazo de un archivo falso, almacenamiento privado de un comprobante y el paso a pago verificado simulado. El registro de esa prueba quedó cancelado; no se efectuó ninguna transacción bancaria. El 5/10/2026 se creó también la tabla con RLS y el bucket privado en producción (`xkfiawkixcyzpfdwccxz`). Se configuraron la clave de Brevo, el remitente verificado `soporte@sgsolutionscr.com`, el origen público y la clave privada de enlaces. Al 6/10/2026 quedan pendientes completar la autenticación DMARC en Brevo, comprobar la entrega real de correos y activar `PEDIDOS_MANUALES_ACTIVOS`. Los registros DKIM ya fueron validados; no se han activado cobros de tarjeta.

Publicar el código por sí solo no activa este flujo: se mantiene deshabilitado hasta completar la configuración de producción y definir `PEDIDOS_MANUALES_ACTIVOS=1`. Activar el flujo manual no activa cobros de tarjeta.
