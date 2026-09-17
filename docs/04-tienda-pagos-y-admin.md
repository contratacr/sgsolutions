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
Implementados: selector español/inglés, catálogo, filtros, carrito persistente, cantidades y solicitud asistida por WhatsApp. La solicitud recopila contacto, retiro o entrega, dirección condicional y notas; después presenta una revisión con códigos de fabricante, subtotales y total estimado antes de abrir WhatsApp. Los datos no se guardan en el navegador ni se envían hasta que la persona confirma el mensaje. SG Solutions confirma disponibilidad, costo de entrega y total antes del pago. La base del panel comprueba sesión y perfil activo; administración persistente y pedidos siguen pendientes de Supabase. No se simulan compras exitosas ni datos de ventas.

## Bloque del 17 de septiembre de 2026

- Checkout propio `/finalizar-compra`: contacto, provincia/cantón/distrito, dirección, receptor alternativo, facturación, notas y preferencia SINPE/transferencia/tarjeta. Es una solicitud asistida; no crea un pedido pagado. Transferencias siempre sujetas a conciliación manual. Tarjetas visibles como próximas, sin recolectar PAN/CVV.
- Datos bancarios y SINPE aportados por el usuario, editables desde contenido. Confirmar moneda CRC de las cuentas antes de activar cobro automático.
- Recomendación provisional: Tilopay Hosted Payment Page. Requiere alta comercial, sandbox y credenciales; falta verificar importes, webhooks y pedido persistente antes de activar cobros reales. https://tilopay.com/developers/api/hosted-payment-page/process-payment
- Panel `/panel/catalogo`: categorías/productos, precios, descripciones, galería, ficha técnica y especificaciones bilingües.
- Panel `/panel/contenido`: casos de éxito con fotografías, publicación, textos bilingües del sitio y cuentas bancarias. Persistencia Supabase mediante migración `20260917000100_contenido.sql`, control de administrador activo, RLS y revisión optimista. En este equipo falta Docker y no hay Supabase configurado; no se verificó guardado contra una base real ni se crearon usuarios.
- Fórmula inicial actualizada: USD × 500 × 1,13 × 1,12; recargo sobre costo de 12%, no margen neto. Múltiplos hacia arriba de 500/1000/5000 CRC según rango. Excepción manual explícita y costos ya en CRC conservados.
- Datos ampliados de 144 de 149 productos desde fichas públicas Intcomex; los cinco restantes conservan únicamente los datos disponibles en catálogo, no especificaciones supuestas. Se alojan localmente 135 fotografías únicas para 140 productos; nueve productos siguen sin fotografía verificada y muestran un indicador explícito. Pendiente API/contenido ampliado del proveedor para cobertura completa.
