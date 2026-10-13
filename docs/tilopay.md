# Integración de Tilopay

El checkout público conserva SINPE Móvil manual y transferencia. La integración de Tilopay se limita a tarjetas y, por ahora, a pruebas locales. El checkout admite retiro y envío por Correos de Costa Rica; el servidor agrega ₡4.000 al total del envío y conserva los datos de entrega y facturación en el pedido privado.

## Estado actual

- SINPE Móvil está desactivado en el panel de Tilopay; tarjeta está habilitada.
- La base remota `SG Solutions Pruebas Tilopay` tenía la migración aplicada; se retiró del entorno local y se pausó el 5 de octubre de 2026 para liberar el cupo gratuito. Se verificaron pagos de prueba aprobado y rechazado mediante la página alojada de Tilopay y su regreso al sitio; ambos quedaron con el estado correcto en la base. No se usaron tarjetas ni fondos reales.
- También se verificaron regreso duplicado, parámetros de URL falsificados, pedido inexistente, abandono antes de pagar, importe distinto y fallo temporal de consulta a Tilopay. Ninguno convirtió un pedido pendiente o rechazado en pagado. El pedido abandonado permanece pendiente en la base de pruebas para inspección.
- Al terminar la comprobación se retiró la marca de verificación reciente del entorno local. Para iniciar otra prueba hay que confirmar nuevamente el modo de pruebas en Tilopay y registrar una nueva hora UTC.
- La ruta de inicio recalcula importes desde el catálogo del servidor, guarda un pedido privado y pide a Tilopay una URL de pago alojado.
- La ruta de regreso consulta la transacción en Tilopay. Ni el estado ni el monto que lleguen por la URL del navegador bastan para marcar un pedido como pagado.
- El panel incluye una vista privada de los últimos 50 pedidos con tarjeta; solo administradores activos pueden abrirla. Sin base de datos configurada, muestra un estado informativo.
- No se configuraron credenciales en archivos versionados. El modo de pruebas requiere una revisión manual reciente del indicador de Tilopay, registrada en `TILOPAY_PRUEBA_VERIFICADA_EN` como fecha ISO; caduca a los 15 minutos.
- La integración permanece deshabilitada en producción. No hay cobros reales.

## Para repetir y ampliar la prueba integral

1. Para una prueba integral de Tilopay, usar Supabase local iniciado con Docker y las migraciones del repositorio aplicadas. El proyecto remoto de pruebas está pausado; no usar la base de producción para esta comprobación.
2. Configurar en un archivo privado las variables `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TILOPAY_API_USER`, `TILOPAY_API_PASSWORD`, `TILOPAY_API_KEY` y `TILOPAY_RETORNO_URL`. Esta última debe apuntar a `/api/pagos/tilopay/resultado`, no a la página pública de resultado.
3. Activar el modo de prueba en el panel de Tilopay y comprobar visualmente que está activo. Definir `TILOPAY_MODO=pruebas` y `TILOPAY_PRUEBA_VERIFICADA_EN` con la hora UTC de esa comprobación.
4. Repetir las pruebas aprobada y rechazada, además de los casos adversos anteriores, cuando cambie el flujo. Confirmar que un pedido solo se marque pagado cuando `consult` indique aprobación, importe y moneda correctos y `environment=Test`.
5. Antes de cobros reales, agregar avisos operativos, protección contra abuso y pruebas de compra completas. El envío y los datos fiscales se verifican con servicios simulados; falta validar el flujo contra el comercio real al publicar.

La documentación oficial de Tilopay para este flujo está en [Hosted payment page](https://tilopay.com/developers/hosted-payment-page), [processPayment](https://tilopay.com/developers/api/hosted-payment-page/process-payment), [consult](https://tilopay.com/developers/api/procesos-operativos/consult) y [entornos](https://tilopay.com/developers/entornos).

## Pruebas sin proyecto remoto — 5 de octubre de 2026

El desarrollo usa `SG_ENTORNO=local` y `SG_ADMIN_LOCAL=1`. Las conexiones pública y privada a Supabase remoto quedaron vacías en `.env.local`. Se conservaron la cuenta administrativa local y el catálogo local. La configuración anterior quedó respaldada en `.privado/respaldos/2026-10-05-retiro-supabase-pruebas.env`, ignorado por Git y con permisos 0600. El proyecto de producción no se modifica.

Para revisar el panel y la aprobación asesorada, con el servidor local en 3107:

```sh
SG_TEST_ALTAS=1 npx playwright test tests/panel-completo.spec.ts tests/asesoria-aprobacion.spec.ts --workers=1
```

Para pedidos, precios acordados, envío, concurrencia y recuperación de fallos sin Docker ni Supabase remoto:

```sh
npm run build
node scripts/probar-pedido-aprobado.mjs
```

Este último usa un servidor REST simulado únicamente en 127.0.0.1:54329 y la aplicación en 3108; los detiene al finalizar. No prueba Postgres, RLS, Storage, Supabase Auth ni un pago real o sandbox de Tilopay. No se envían correos ni se realizan cobros.

Supabase local completo sigue requiriendo Docker compatible, todavía ausente en esta computadora. Cuando esté disponible, `npm run db:iniciar` inicia el entorno y aplica sus migraciones; `npm run db:detener` lo detiene. Para repetir un pago alojado de Tilopay, hacen falta además su modo sandbox confirmado y una URL de retorno accesible por el navegador. No se necesita otra cuenta de Supabase para estas pruebas locales.

## Revisión del portal — 9 de octubre de 2026

Se verificó visualmente la cuenta SG Solutions: tarjetas habilitadas y modo de pruebas activado. No se cambió el interruptor. El portal no mostró una confirmación explícita de aprobación comercial. La prueba real se hará después de completar y publicar la web en el dominio definitivo, con el usuario ingresando su tarjeta.

## Preparación de tarjeta — 10 de octubre de 2026

La tarjeta vuelve a ser una opción del checkout. El comprobante solo se muestra para SINPE o transferencia. Pruebas y producción tienen mensajes distintos en español e inglés.

El servidor permite producción únicamente con `SG_ENTORNO=produccion`, `TILOPAY_MODO=produccion`, `TILOPAY_PRODUCCION_VERIFICADA_EN` válido y `TILOPAY_ENTORNO_RESPUESTA` confirmado con el proveedor (no puede ser Test). Además requiere credenciales, base y retorno HTTPS configurados. La consulta verifica el entorno del pedido y la respuesta del proveedor antes de marcarlo pagado.

Esta preparación quedó pendiente ese día por la sesión vencida del portal. Véase la revisión posterior.

## Revisión y publicación — 12 de octubre de 2026

- El portal de SG Solutions confirmó «Production mode activated successfully», con tarjetas habilitadas. Se verificó la autenticación del servidor sin iniciar un pago.
- Se configuraron las variables privadas de producción en el Worker de la cuenta SG Solutions. El retorno usa `https://sgsolutionscr.com/api/pagos/tilopay/resultado` y la respuesta esperada es `Production`, documentada por Tilopay en https://tilopay.com/developers/api/procesos-operativos/consult-transactions.
- Antes del cambio de modo, se probaron un pago aprobado y uno rechazado con tarjetas de prueba. Los retornos duplicados no duplicaron los correos de confirmación.
- Pasó la prueba integrada aislada de compras: existencias inferiores a 15, cambios de costo, envío, concurrencia, comprobantes, fallos de base/correo y estados administrativos. Los pagos simulados de esta prueba no sustituyen las dos transacciones sandbox anteriores.
- Se aplicaron las migraciones de autogestión y cola de correos en el proyecto de producción `xkfiawkixcyzpfdwccxz`. La sincronización remota terminó con 1.639 productos visibles, ninguno de Eurocomp por debajo de 15 unidades, y 1.448 precios de Eurocomp coincidentes con la fórmula y el redondeo configurados.
- El Worker está publicado en la cuenta `e4cb0e4b96ca5f70e2512772084ae184`, con rutas para el dominio y www. Se completó el cambio de servidores de nombres de GoDaddy: el dominio principal responde 200 por HTTPS y www redirige 308 al principal. Supabase usa el dominio definitivo como Site URL. La clave de Brevo se guardó como secreto del Worker, el remitente asesor@sgsolutionscr.com está activo y el correo de prueba fue entregado. Se habilitaron los pedidos manuales. La compra real final sigue pendiente del propietario.
- No se ejecutaron cobros reales ni órdenes o reservas en Eurocomp. La compra real final la realizará el propietario. La facturación electrónica sigue siendo un proceso administrativo, no una integración automática con GTI.
