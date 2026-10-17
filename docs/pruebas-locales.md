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

## Automatización y revisión de seguridad — 16 de octubre de 2026

Las pruebas mantenidas se ejecutan en GitHub Actions por grupos independientes: tienda, cuentas/panel, contenido, compras/correos e integraciones locales. El Worker utiliza Supabase efímero y proveedores simulados. Las variables de producción se vacían explícitamente; no hay cobros, correos reales ni despliegue automático. `scripts/testing/regresion.mjs` conserva los resultados por bloque. Los recorridos manuales antiguos que dependen del laboratorio privado siguen siendo pruebas locales, no pruebas contra producción.

Después de publicar, ejecutar únicamente `SG_PRODUCCION_SMOKE=1 npm run test:produccion:smoke`, o el workflow manual `produccion-smoke.yml`: seis solicitudes HTTP de lectura, sin navegador ni píxeles, creación de cuentas, correos o pagos. No ejecutar la regresión completa contra el dominio público. La configuración general rechaza destinos que no sean loopback. La sincronización programada de Eurocomp es una operación real distinta del testing.

Controles de seguridad agregados:

- Buscar secretos en archivos versionables y en las versiones históricas de texto (`node scripts/verificar-secretos.mjs --historial`). Los informes muestran rutas, nunca credenciales.
- `npm run verificar:publico` revisa `public`, los chunks del navegador y los assets de OpenNext; detecta formatos de claves privadas, JWT no anónimos y coincidencias con secretos disponibles en el entorno de compilación. Corre automáticamente después del build. No escanea el Worker de servidor como si fuera un archivo público.
- Auditar dependencias de producción sin excepciones. El informe completo mantiene visible la única alerta conocida de desarrollo: [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), propagada por `eslint-config-next → fast-glob → micromatch → braces`. No tiene versión corregida publicada; no se fuerza un downgrade incompatible de Next. Cualquier alerta nueva alta o crítica falla el control completo. La entrada afectada son patrones de herramientas de desarrollo; no hay entrada de la tienda que use esa cadena.
- Límites de cuerpos HTTP en bytes durante la lectura, incluyendo peticiones sin `Content-Length`, declaraciones falsas y multipart de comprobantes. Pagos y pedidos validan el mismo cuerpo una sola vez.
- Protección de ráfagas de asesoría por instancia; es complementaria y no sustituye un límite distribuido en Cloudflare. No se modificaron reglas de Cloudflare ni se habilitaron cobros.
- HSTS y cabeceras privadas sin caché ni referencia en rutas de cuenta/panel; se conservan las verificaciones de origen, autenticación, propiedad de favoritos, aprobación de pedidos y firma/tipo/tamaño de comprobantes.

La revisión de esta entrega no encontró coincidencias de secretos en el árbol versionable, 2.045 versiones históricas de texto ni los assets públicos compilados revisados. El audit de dependencias de producción no reportó vulnerabilidades conocidas. Los endpoints de catálogo/recomendaciones se prueban para excluir costos y credenciales. Estas comprobaciones son defensa y evidencia de alcance definido, no una garantía de ausencia absoluta de vulnerabilidades ni un pentest independiente.

Las cookies de sesión Supabase se marcan `HttpOnly` porque esta aplicación usa Supabase exclusivamente desde el servidor; el navegador llama a nuestras rutas. Se conserva `SameSite=Lax` para los retornos de OAuth y `Secure` en producción HTTPS. Las pruebas de código de verificación comprueban que la sesión funcione y que `document.cookie` no exponga los tokens. Si se incorpora un cliente Supabase en el navegador, revisar explícitamente esta arquitectura; no quitar la protección como solución rápida.

También se verificó en producción, mediante consultas de metadatos de solo lectura, que `catalogo_privado`, `favoritos`, `pedidos_manuales`, `pedidos_tilopay`, `perfiles` y `solicitudes_asesoria` tienen RLS activo y no permiten SELECT al rol anónimo. El bucket de comprobantes es privado. No se modificaron datos ni permisos de producción.

Validación local de esta entrega: regresión principal con 304 aprobadas y seis omitidas; dos fallos de escritura de trazas por concurrencia local se repitieron por separado y aprobaron. Aprobaron además contenido, cuenta, código, comprobantes, Tilopay alojado, SQL y Worker con proveedores simulados, así como verificar y build del Worker. El smoke de producción completó sus seis solicitudes de lectura. Los workflows nuevos aún no se han ejecutado en GitHub: se validarán tras el siguiente push autorizado.

## Header administrativo y bandeja de pedidos

El header administrativo se comparte entre Inicio, Productos, Proveedores, Contenido, Pedidos, Usuarios y Estadísticas; mantiene el selector de idioma, el retorno al sitio y el cierre de sesión. La navegación horizontal oculta la barra visual sin bloquear teclado o desplazamiento y muestra parte de la siguiente opción cuando hay más contenido. El hover y la sección activa se indican con una línea inferior.

Estado del pago comparte la cuadrícula de filtros con forma de pago, entrega y orden. Las filas de asesoría, manuales y tarjeta reservan la última columna para expandir/contraer también en móvil. Archivar sigue siendo reversible y conserva las restricciones de pedidos pendientes de pago o entrega; no se agregó archivo indiscriminado a usuarios, catálogo ni configuración.

La bandeja compacta agrupa búsqueda y creación arriba, etapas con contadores de texto sin círculos, y cuatro filtros en una cuadrícula (dos columnas en móvil). El total filtrado queda a la derecha en una línea de estado compacta. Se conservan nombres accesibles, estados de filtros y desplazamiento horizontal de etapas.

## Contadores de navegación

Favoritos y carrito comparten una instantánea de presentación en la cabecera. Los iconos permanecen disponibles desde el HTML inicial; los contadores se revelan juntos al recuperar el estado del navegador (y los favoritos de cuenta si corresponde), sin temporizadores. Los contadores del carrito no dependen de completar la consulta del catálogo. Una falla de favoritos no bloquea el carrito. La prueba `contadores-navegacion.spec.ts` observa cada frame para detectar apariciones escalonadas y desapariciones al navegar entre Inicio y Tienda, con recargas y ambos idiomas.

## Prevención de panel sin estilos al entrar

Se centralizaron en el layout raíz los estilos del header, protección de cambios, Pedidos, Usuarios y Estadísticas, junto al CSS administrativo que ya se cargaba allí. Se eliminaron sus imports tardíos desde componentes y páginas. Así el formato administrativo se descarga con el CSS inicial, en lugar de depender de llegar al módulo de una ruta. No se oculta el contenido con temporizadores ni se agrega una pantalla en blanco.

`panel-estilos-estables.spec.ts` abre cada una de las siete secciones en páginas nuevas, retrasa las hojas de estilo, observa los frames del header y realiza una transición real entre secciones, en español/inglés y Chrome/WebKit móvil. La prueba local previa del header pasó: la captura del usuario no se reprodujo en ese intento, por lo que no se atribuye una reproducción confirmada. El cambio elimina la dependencia de estilos de carga separada que podía dejar el header sin formato.

### Ajustes tras ejecutar la regresión en GitHub

Los checkouts limpios generan `catalogo-inicial.json` desde la base versionada antes de arrancar las pruebas; el archivo local sigue ignorado. La prueba de preparación de un enlace empresarial se ejecuta en el entorno aislado de Pedidos, con sesión temporal, sin depender de una cuenta del equipo del desarrollador. El import de la función de fichas indica `.ts` para distinguirlo del JSON con el mismo nombre en Node 22.

Las pruebas de checkout esperan cada paso visible antes de pulsar Siguiente. Las pruebas de asesoría reflejan la navegación directa a WhatsApp y simulan el destino externo sin enviar mensajes. La detección de móvil usa la configuración del dispositivo, también en la vista previa de Capacitor. Las pestañas solo deben mostrar una opción parcial si existe desbordamiento; se comprueba explícitamente a 320 px. La navegación del panel de demostración permanece deshabilitada hasta completar la hidratación para conservar el primer clic.

Cada bloque del runner conserva su propio directorio de resultados (capturas y trazas). Los artefactos de GitHub incluyen esos directorios de pruebas aisladas para que una ejecución posterior no borre la evidencia de un fallo previo. El desplazamiento automático de la navegación de demostración es inmediato y no compite con un clic durante una animación; la prueba de teclado espera a que los controles estén habilitados.

La edición del primer paso de compra se deshabilita mientras se restaura el borrador: el formulario remonta sus valores iniciales al concluir esa restauración y antes podía perder un nombre escrito demasiado pronto. Un fieldset sin caja visual mantiene el diseño y bloquea la edición hasta ese punto. Los envíos de favoritos usan `keepalive`; su prueba de persistencia espera la respuesta de guardado antes de recargar, distinguiendo la actualización visual inmediata de la confirmación del servidor.
