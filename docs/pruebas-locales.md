# Laboratorio local de SG Solutions

Preparado el 12 de octubre de 2026. No modifica producción.

- App: http://127.0.0.1:3107/cuenta
- Panel: http://127.0.0.1:3107/panel
- Buzón de correos capturados: http://127.0.0.1:54324
- Supabase Studio local: http://127.0.0.1:54323

Las cuentas `admin@sgsolutions.test` y `cliente@sgsolutions.test` son usuarios reales de **Supabase local**, con contraseñas aleatorias guardadas únicamente en `.privado/qa-local/cuentas.json`. El administrador puede acceder al panel y el cliente no. No existen en la base de producción.

Supabase CLI 2.120 permite el runtime nativo de macOS, sin Docker. La configuración privada utiliza `.privado/qa-local/supabase` y las migraciones del repositorio. Para volver a iniciar este laboratorio ya preparado:

```sh
node .privado/qa-local/iniciar.mjs
```

El comando valida que las tres conexiones de Supabase sean locales y que Tilopay esté configurado en pruebas antes de arrancar. No recrea usuarios ni borra datos.

## Aislamiento

- `.env.local` apunta a Supabase local; su copia anterior permanece en `.privado/qa-local/env-anterior.env`.
- Eurocomp y Brevo están interceptados por un servidor en `127.0.0.1:54329`. No hace solicitudes externas a esos proveedores. Bloquea cualquier intento de enviar órdenes o preventas.
- Las credenciales activas de Eurocomp/Brevo son ficticias. Los correos de pedidos quedan en Mailpit, aunque muestren un destinatario real.
- Tilopay sí se consulta en su entorno de pruebas. Requiere comprobar el aviso del portal y una marca de verificación de menos de 15 minutos. Nunca actualice esa marca sin revisar el portal. No se deben usar tarjetas reales.
- Las pruebas locales no habilitan Google ni Apple. Esos proveedores requieren una revisión independiente del entorno publicado.
- Los correos de Auth local usan las plantillas predeterminadas de Supabase: el runtime nativo no admite `content_path`. Esto no verifica los templates de producción.
- El historial normal excluye tarjetas de prueba por diseño. Las transacciones sandbox se revisan en **Panel → Pedidos → Tarjeta de prueba**. La compra local por SINPE del administrador sí aparece en su historial.

## Evidencia de esta sesión

En `.privado/qa-local/`: capturas de Tilopay aprobado/rechazado, revisión del panel, compra SINPE con comprobante, registro y confirmación, permisos/RLS y capturas en español/inglés, móvil/escritorio. Los scripts de pruebas y las sesiones contienen datos privados de prueba y no se versionan.

Las pruebas no equivalen a una certificación de producción: dominio, OAuth externo, entrega de correo real y cobros reales se validan aparte con autorización.

El pago con tarjeta ahora genera confirmaciones para el cliente y el equipo mediante una cola privada. Se verificaron tres retornos simultáneos con dos correos totales (uno por destinatario). Si el envío falla, permanece pendiente y se reintenta al volver a procesar el retorno del pago. Las migraciones `20261012000400_autogestion_cuenta.sql` y `20261012000500_correos_pago_tarjeta.sql` se aplicaron en local y en el proyecto de producción de SG Solutions el 12 de octubre de 2026.

## Revisión de cuenta y panel en Safari — 12 de octubre

- Safari instalado en macOS: inicio de sesión con administrador local, menú de cuenta → Mis datos, guardar datos, Cuenta y seguridad, acceso al panel, abrir/cerrar administración de usuario, ver actividad, cambiar a inglés y cerrar sesión. El idioma se conserva entre rutas.
- WebKit automatizado: español/inglés, 1440 px y 390 px. Diez pruebas de perfil/seguridad y dieciséis de gestión de usuarios y protección de rutas aprobadas. La comprobación antigua `.cuenta-perfil` se actualizó a `.cuenta-panel`, correspondiente al diseño actual.
- Recorrido con Supabase local: 28 combinaciones de página/idioma/tamaño, sin errores JavaScript ni desbordamiento horizontal. Se guardó catálogo/contenido sin alterar sus valores, se recorrieron pestañas, filtros, búsquedas y cuadros de usuario.
- Acciones adicionales en los cuatro escenarios: producto nuevo inválido y restablecer, agregar/quitar categoría sin guardar, visor de imágenes, quitar/deshacer y URL inválida, búsqueda de proveedor, detalles de estadísticas, pedido ficticio → pendiente de pago → pagado, reenvío de correo al buzón local y cierre de sesión con bloqueo posterior de `/panel`.
- Se agregó una regresión de los tres enlaces del desplegable de cuenta en `tests/cuenta-seguridad.spec.ts`. Comprueba que el blur de Safari no interrumpa la navegación. Los cuatro casos del archivo pasaron en WebKit.

Resultados y capturas: `safari-panel.json`, `safari-acciones.json`, `safari-cuenta.log`, `safari-usuarios.log`, `safari-permisos.log` y `safari-regresion.log` en `.privado/qa-local/`. El archivo de usuarios inicial registró cuatro fallos del selector obsoleto; la repetición de esos cuatro casos pasó después de actualizarlo. La emulación móvil de WebKit no equivale a una prueba en un iPhone físico. Esta revisión no ejecutó sincronización externa, facturación GTI, órdenes Eurocomp ni cobros reales.

### Navegación repetida y estado del menú

- Se corrigió el estado persistente del menú móvil: navegar y pulsar Atrás podía reabrirlo al volver a la ruta original. Los enlaces ahora cierran el estado al iniciar la navegación.
- Cuatro pruebas WebKit de menú lateral (español/inglés y dos tamaños) verifican Atrás/Adelante, cierre, foco, bloqueo del fondo y dimensiones de cabecera.
- 148 comprobaciones de navegación con Supabase local aprobadas: dos vueltas por Inicio, las tres secciones de cuenta y las siete del panel, en español/inglés y 1440/390 px. Incluyen recarga, historial, desplegable, ausencia de desbordamiento, estabilidad del navbar, cierre de sesión y protección posterior del panel. Evidencia: `safari-navegacion-repetida.json` y `.log`.
- Safari nativo confirmó el regreso desde el menú sin reapertura y la persistencia del idioma. Las comprobaciones automatizadas usan WebKit; no sustituyen una prueba en iPhone físico.
- `npm run verificar` (incluye textos) y compilación local completados correctamente. Sin publicación.
- En Safari nativo se detectó además que el panel podía permanecer visible tras cerrar, hasta recargar. Se desmonta ahora el portal cuando `abierto` es falso, sin esperar la animación de salida. Se comprobó abrir/cerrar nuevamente en Safari. La prueba automatizada suspende deliberadamente la animación de cierre y exige que el diálogo se elimine y devuelva el foco al botón.
