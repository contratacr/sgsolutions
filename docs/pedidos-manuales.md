# Pedidos por SINPE Móvil y transferencia

El recorrido se inspira en la secuencia pública de Unimart: carrito, datos de entrega, método de pago, completar orden y recibir un número de pedido. Unimart indica que confirma SINPE automáticamente y pide enviar por correo el comprobante de transferencia junto con el número de pedido. SG Solutions todavía no tiene una integración bancaria para confirmar SINPE; por eso **ningún comprobante marca un pedido como pagado**.

Fuentes: [cómo realizar una compra](https://www.unimart.com/pages/como-realizar-una-compra), [formas de pago](https://www.unimart.com/pages/formas-de-pago) y [alerta del BCCR sobre comprobantes falsificados](https://www.bccr.fi.cr/comunicacion-y-prensa/Docs_Comunicados_Prensa/CP-BCCR-026-2021-Alerta_intentos_estafas_timo_basado_Sinpe_Movil.pdf).

## Flujo propuesto

1. El cliente compra como invitado. El servidor vuelve a calcular productos, precios y disponibilidad, guarda el pedido privado y entrega un número `SG-…`. El pedido empieza **en revisión**; no se solicita un depósito todavía.
2. El administrador confirma disponibilidad y costo de entrega. El total queda fijado y el pedido pasa a **pendiente de pago**. Se envía un correo con el número, total, datos bancarios y enlace privado; si falla el correo, el panel muestra el enlace para compartirlo manualmente.
3. El cliente puede subir un JPG, PNG o PDF de hasta 5 MB. Se guarda en un bucket privado y el pedido pasa a **comprobante recibido**; el equipo recibe un aviso si el correo está configurado. También puede comunicar el número por otros canales.
4. El administrador verifica en la cuenta bancaria el monto exacto y marca **pago verificado**. La captura por sí sola nunca confirma el pago.

El panel muestra los 50 pedidos manuales más recientes junto a los de tarjeta. SINPE y transferencia no pasan por Tilopay. El costo de envío se confirma antes de compartir las instrucciones de pago.

## Configuración antes de activar

- Aplicar `20260930000200_pedidos_manuales.sql` al proyecto correcto de Supabase. La migración crea una tabla con RLS y un bucket de comprobantes privado.
- Configurar de forma privada `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PEDIDOS_ENLACE_SECRET` (aleatorio, mínimo 32 caracteres), `PEDIDOS_ORIGEN_PUBLICO` (origen HTTPS del sitio) y, para correo, `BREVO_API_KEY` y `BREVO_REMITENTE` verificado.
- Tras probar el flujo de compra, correo, comprobante, revisión bancaria simulada y estados en el entorno correspondiente, definir `PEDIDOS_MANUALES_ACTIVOS=1`. Sin esta marca, el checkout conserva la solicitud por WhatsApp. No publicar secretos en Git.
- En `SG_ENTORNO=local`, la aplicación solo acepta un Supabase local y el origen `http://127.0.0.1:3107`. En `SG_ENTORNO=test` puede usar el Supabase de pruebas con ese origen para pruebas integradas. El envío real de correos se mantiene desactivado en ambos entornos.

El 30/9/2026 se aplicó la migración al proyecto **SG Solutions Pruebas Tilopay** y se probó la creación de un pedido, rechazo de un enlace inválido, rechazo de un archivo falso, almacenamiento privado de un comprobante y el paso a pago verificado simulado. El registro de esa prueba quedó cancelado; no se efectuó ninguna transacción bancaria. Producción todavía requiere su propia migración y configuración antes de habilitar la opción.

Publicar el código por sí solo no activa este flujo: se mantiene deshabilitado hasta completar la configuración de producción y definir `PEDIDOS_MANUALES_ACTIVOS=1`. Activar el flujo manual no activa cobros de tarjeta.
