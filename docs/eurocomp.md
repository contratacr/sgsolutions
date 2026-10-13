# Consulta privada de Eurocomp

La integración usa únicamente `wsc_request_bodega_all_items` en `https://eurocompcr.com/webservice.php`. La consulta real del 9 de octubre de 2026 con `bid=0` devolvió código 0 y 11.506 artículos, con precios en USD y existencias. Eurocomp aún debe confirmar qué significa la bodega 0 y cuáles son las bodegas autorizadas.

## Uso

Entre en **Panel → Proveedores**, busque por nombre, marca, código Eurocomp o código de fabricante. Se muestran 20 resultados por página. El botón **Actualizar Eurocomp** guarda una copia privada y actualiza precios y existencias de la tienda, preservando sus textos y decisiones de publicación; se admite un intento manual cada cinco minutos y no se reintenta automáticamente. Si falla, conserva la copia anterior. Abrir páginas, buscar y paginar siempre utiliza la copia guardada.

La tienda local usa productos tecnológicos de Eurocomp con al menos 15 unidades. Se excluyen electrodomésticos, software y familias no identificadas. La importación inicial dejó 1.469 publicados y uno pendiente por imagen. Se mantienen las categorías padre del proveedor para distinguir, por ejemplo, ventiladores de PC de electrodomésticos. Los precios de venta usan el cambio de ₡500/USD y el recargo existente del 20%, redondeados hacia arriba a ₡500 por debajo de ₡50.000 y ₡1.000 a partir de ese importe. Comparación autenticada del 9 de octubre de 2026: el artículo 2800069 (TL-WN881ND) muestra USD 9,56 + I.V.A y su ficha dice “Adicional al Precio”; SOAP devuelve 9,56 USD. Para esta cuenta el precio comprobado es neto, contrario a la interpretación inicial de la guía. El cálculo de venta aplica recargo e IVA del 13% una vez antes de redondear. El usuario confirmó con Eurocomp que se aplica el 13% sin excepciones; SOAP no informa una tasa por artículo en la respuesta revisada. Antes del pedido se consulta cada artículo por `wsc_request_bodega_all_item` y se rechazan cambios de precio o existencias inferiores a 15. No se han integrado órdenes ni reservas del proveedor. La sincronización periódica está preparada; falta activarla y publicar el catálogo en Supabase. No se ha activado en producción.

## Configuración del servidor

Variables privadas, nunca `NEXT_PUBLIC_`:

- `EUROCOMP_API_KEY`: opcional; si existe se usa con `ws_cid=0`.
- `EUROCOMP_WEB_SERVICE_ID` y `EUROCOMP_PASSWORD`: alternativa legacy comprobada.
- `EUROCOMP_BODEGA_ID`: 0 es el valor probado; confirmar con Eurocomp.
- `EUROCOMP_ACTUALIZACION_ACTIVA=1`: permite la actualización. Debe activarse únicamente tras verificar la capacidad del servidor para procesar la descarga completa.

Local: secretos en `.env.local` ignorado; copia en `.privado/admin-local/eurocomp.json`, con permisos 0600. Los archivos de investigación tampoco se versionan.

Producción: aplicar `supabase/migrations/20261009000100_eurocomp_privado.sql` y guardar secretos en Cloudflare. La tabla y las funciones requieren un administrador activo; no tienen acceso público. Las credenciales no se guardan en la tabla ni se devuelven al navegador. Ninguno de esos pasos de producción se ha ejecutado en esta entrega.

La respuesta real ronda 33 MB. El parser procesa bloques de XML y guarda solo los campos necesarios. El catálogo usa ISO-8859-1; también se acepta UTF-8. Se rechazan DTD, respuestas truncadas, códigos duplicados y más de 80 MiB o 50.000 artículos. El tiempo máximo es 90 segundos. El trabajo completo debe medirse en el plan de Workers antes de habilitarlo: no asumir que el presupuesto de CPU del plan gratuito admite esta descarga. La descarga programada se ejecutará en Node mediante GitHub Actions, fuera de las peticiones de Cloudflare. El botón del panel debe permanecer desactivado en Workers gratuito mientras no se mida su capacidad.

## Verificación

`npm run verificar`, `npm run build`, pruebas de protocolo en `tests/eurocomp.spec.ts` y panel local en `tests/eurocomp-panel.spec.ts` (`SG_TEST_ALTAS=1`, un worker). Las pruebas del protocolo usan datos ficticios y no consumen consultas de Eurocomp. Las del panel usan la copia privada guardada y no pulsarán la actualización real.

Fuentes: [WSDL de Eurocomp](https://eurocompcr.com/webservice.php?wsdl), [guía oficial de SiReTT](https://sirettonline.net/descargas/guias/SiReTT-Guia-Webservices.pdf).

## Actualización horaria preparada

Aplicar también `20261009000200_eurocomp_sincronizacion.sql` y `20261009000300_origen_compra.sql`. Las sesiones internas de verificación de compra no se muestran como solicitudes de asesoría. La publicación del catálogo privado, público y copia del proveedor se realiza en una transacción, con revisión concurrente y un límite de un intento programado por hora; la actualización manual tiene un intervalo de cinco minutos. Un fallo conserva la publicación anterior.

`.github/workflows/eurocomp.yml` ejecuta `npm run sincronizar:eurocomp` una vez por hora, solamente si la variable de repositorio `EUROCOMP_SYNC_ACTIVA=1`. Configurar las credenciales como secretos de GitHub, nunca en el archivo del workflow. No se han configurado esos secretos ni activado el trabajo.

En las tarjetas hay solamente **Agregar al carrito** (una unidad); la ficha y el carrito permiten editar cantidades. El stock del proveedor no implica una reserva. Antes de crear el pedido se vuelve a comprobar precio y stock; no se envían órdenes a Eurocomp.

## Prueba integrada aislada

`node scripts/probar-compra-eurocomp.mjs` levanta servicios ficticios exclusivamente en loopback y un servidor Next separado. Verifica cambios de precio/stock, envío de ₡4.000, duplicados, recuperación de errores, comprobantes privados, avisos de correo y pago simulado con consulta de resultado. Restaura los archivos locales utilizados. No envía correos, cobros ni órdenes reales. La opción `SG_PRUEBAS_INTEGRACION` solo funciona con `SG_ENTORNO=local` y URLs HTTP de loopback; producción ignora los servicios de prueba.

## Organización del catálogo

El inventario completo del proveedor se conserva en la copia privada. La tienda publica familias tecnológicas admitidas con al menos 15 unidades. Los nuevos artículos sin imagen o sin traducción de su familia quedan en borrador para revisión. Se excluyen electrodomésticos y servicios. Las subcategorías se traducen al español e inglés y se pueden filtrar junto con categoría, marca y búsqueda. Las actualizaciones conservan los campos editoriales y las decisiones de publicación existentes.

### Discrepancia de promociones comprobada el 10 de octubre de 2026

El artículo código 10015, parte 100-100000031BOX, muestra en la web autenticada USD 100 + IVA y USD 210,37 tachado. Las consultas SOAP de solo lectura `wsc_request_bodega_all_item`, `wsc_request_bodega_all_items_list` y `wsc_request_bodega_all_items`, con bodega 0 y las credenciales actuales, devuelven `precio=210.37`, `currency_code=USD`, `stock=57` y `precios_extra` vacío. En la respuesta completa consultada no se encontraron listas `precios_extra` con entradas. El WSDL define precios extra mediante `idx`, `valor` y `currency_code`, pero no documenta una operación específica para promociones ni su vigencia. No se debe interpretar el precio normal como costo promocional ni asignar manualmente USD 100 en la sincronización. Se requiere que Eurocomp confirme cómo obtener por API las promociones aplicables a esta cuenta y su vigencia, o corrija la respuesta del servicio existente. Evidencias XML quedan en `.privado/`, nunca en el repositorio público.

## Actualización manual entre sincronizaciones

La migración `20261013000200_eurocomp_manual.sql` reduce únicamente el intervalo de las consultas manuales a cinco minutos. El trabajo horario conserva su límite y comparte el bloqueo con el panel. Se necesita `EUROCOMP_ACTUALIZACION_ACTIVA=1` en el servidor para habilitar el botón, después de probar la capacidad del Worker. Si está apagado, el panel lo indica explícitamente. Las respuestas vacías, los fallos del proveedor y los conflictos con ediciones conservan el catálogo anterior.
