# Integración de Tilopay

El checkout público conserva SINPE Móvil manual y transferencia. La integración de Tilopay se limita a tarjetas y, por ahora, a pruebas locales con retiro en tienda. El costo de envío se confirma después de revisar el pedido, por lo que no se incluye en un cobro automático.

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
5. Antes de cobros reales, agregar avisos operativos, protección contra abuso y pruebas de compra completas. Revisar también el flujo de envío con un total definitivo.

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
