# Ampliación confirmada: tienda, idiomas y administrador

Isaac confirmó carrito y pagos en línea, español con opción de inglés, ubicación de la tienda física y administración de productos/contenido. La identidad elegida es azul del uniforme con acentos naranja y logo blanco en fondos oscuros. Estas decisiones sustituyen las propuestas iniciales de catálogo sin cobro y un solo idioma.

## Qué entra en la fase 1 ampliada
- Productos: agregar, editar, publicar, retirar, fotos, categoría, especificaciones, traducciones, precio, moneda e inventario vendible. Archivar productos con ventas; conservar su copia en pedidos. No borrar historia comercial.
- Pedidos: carrito, revisión de precios/stock en servidor, datos de contacto y entrega/retiro, sesión de pago y confirmación verificable.
- Administrador: productos, categorías, pedidos, ajustes de contacto, contenido y selección de imágenes de la marca. Campos definidos y validados; no permitir HTML, JavaScript o CSS arbitrarios.
- Español e inglés desde catálogos. Traducciones de producto explícitas y estado de traducción; no publicar contenido incompleto. Idioma y moneda son decisiones distintas: aún falta confirmar CRC, USD o ambas.
- Ubicación: dirección visible, foto real de la oficina y enlace a Maps. Antes de un pin exacto o indicaciones embebidas, confirmar la ficha y coordenadas. No inventar coordenadas.

## Opciones de pago investigadas el 9 de septiembre de 2026

| Opción | Evidencia oficial | Adecuación y lo que falta confirmar |
| --- | --- | --- |
| ONVO | [Documentación](https://docs.onvopay.com/) con API REST, llaves de prueba/producción, checkout y webhooks | Candidato para tienda integrada. Pedir propuesta para la sociedad: comisiones totales, liquidación, moneda, contracargos, reembolsos y aprobación del comercio. |
| Tilopay | [Portal técnico](https://tilopay.com/developers) y [página de pago alojada](https://tilopay.com/developers/api/hosted-payment-page/process-payment) | Candidato para checkout alojado. Confirmar adquirente y modalidad comercial; su modalidad integrador requiere [afiliación bancaria y credenciales específicas](https://support.tilopay.com/portal/es/kb/articles/configurar-un-m%C3%A9todo-de-pago-en-tilopay). |
| BAC Compra-Click | [Ayuda oficial para Costa Rica](https://ayuda.baccredomatic.com/para_empresas_o_negocios/comercios_afiliados/compra-click?country=es-cr) describe enlaces de pago en web/correo/redes | Útil para cobro de una cotización o enlace manual. Para carrito automático hay que confirmar API, validación de estado y contrato; no asumir que un enlace manual equivale a integración completa. |

**Recomendación técnica provisional:** comparar ONVO y Tilopay para un checkout alojado; así SG Solutions no recibe números de tarjeta ni CVV en su aplicación. No elegir por una comisión aislada: solicitar condiciones reales para la sociedad y el banco del datáfono actual. No se han creado cuentas, contratado servicios ni enviado solicitudes.

## Flujo de pago a implementar después de elegir proveedor
1. Navegador envía identificadores y cantidades, jamás un total confiable.
2. Servidor lee productos publicados, valida stock/precio/moneda e impuestos y crea pedido con copia inmutable de líneas. Reserva stock de manera atómica con vencimiento.
3. Crear sesión de checkout con clave idempotente y referencia interna. Redirigir únicamente a un dominio permitido del proveedor.
4. El regreso del navegador muestra estado pendiente. Nunca lo utiliza como prueba de pago.
5. Endpoint del proveedor valida firma/autenticidad, referencia, importe y moneda; consulta al proveedor cuando su contrato lo requiera. Deduplica eventos y aplica transición de estado transaccional.
6. Solo tras confirmación válida se descuenta/resuelve reserva, marca pagado y crea correo en cola. Probar reintentos, eventos fuera de orden, cancelación, expiración, reembolso y pago tardío.

Tablas adicionales: `categorias`, `producto_traducciones`, `producto_imagenes`, `precios_producto`, `existencias`, `reservas_inventario`, `pedidos`, `lineas_pedido`, `intentos_pago`, `eventos_pago`, `ajustes_publicos`, `auditoria_admin`. RLS: visitante solo catálogo publicado/ajustes públicos; pedidos por servidor y acceso de consulta con token firmado limitado al pedido (o cuenta cliente por decidir). Solo administrador activo modifica catálogo/ajustes. Eventos de pago se escriben exclusivamente desde el servidor verificado; lectura interna autorizada, sin datos de tarjeta.

## Condiciones antes de vender
Faltan productos vendibles con precios/moneda/stock, modalidades de envío/retiro, costos, garantías/devoluciones, impuestos aplicables, responsable de pedidos y pasarela aprobada. La integración de facturación electrónica sigue fuera del módulo inicial; definir cómo se emitirá la factura por el sistema actual. Los textos comerciales/legales deben ser aportados o revisados por la empresa.

## Estado del arranque
Implementados: selector español/inglés, tienda de muestra basada en categorías reales, filtros, carrito persistente, cantidades y consulta por WhatsApp. El pago permanece deshabilitado con un aviso visible. La base del panel comprueba sesión y perfil activo; administración de productos/ajustes y pedidos está planificada, todavía no es un CRUD funcional. No se simulan compras exitosas ni datos de ventas.
