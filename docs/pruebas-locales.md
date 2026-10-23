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

La regresión completa se inicia solo manualmente cuando se solicita, sin ejecutarla en cada push ni antes de cada despliegue. En push/PR se conservan las verificaciones rápidas de tipos, lint, textos, secretos y dependencias. Las pruebas mantenidas se ejecutan en GitHub Actions por grupos independientes: tienda, cuentas/panel, contenido, compras/correos e integraciones locales. El Worker utiliza Supabase efímero y proveedores simulados. Las variables de producción se vacían explícitamente; no hay cobros, correos reales ni despliegue automático. `scripts/testing/regresion.mjs` conserva los resultados por bloque. Los recorridos manuales antiguos que dependen del laboratorio privado siguen siendo pruebas locales, no pruebas contra producción.

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

## Diagnóstico de estadísticas — 17 de octubre de 2026

Corrección del diagnóstico inicial: los dos eventos del 13 de octubre correspondían a la base LOCAL, no a producción. Se verificó directamente en el SQL Editor del proyecto `xkfiawkixcyzpfdwccxz`: producción tenía cero eventos y ya existían `eventos_analitica.visitante`, `resumen_estadisticas_panel`, `productos_vistas_diarias` y `popularidad_productos_panel`. Por tanto, no se deben repetir las migraciones del 13 de octubre. El registro anterior dependía de una aceptación que solo se ofrecía desde el footer. La función SQL anterior no excluía administradores por sí sola, aunque el navegador y la API ya tenían exclusión para administradores activos.

El verificador ahora rechaza conexiones loopback por defecto, identifica el entorno y exige confirmar el proyecto remoto. Además, no considera ausente una función privada solo porque OpenAPI la oculte al rol del servidor. No se insertaron eventos sintéticos ni se recuperaron identificadores de visitantes de producción.

Aplicar únicamente `20261017000100_excluir_analitica_administradores.sql` y `20261017000200_estadisticas_agregadas.sql` en el proyecto verificado, en una transacción. Las migraciones anteriores ya están presentes en producción. Revisar permisos y firmas desde SQL, o ejecutar `npm run verificar:estadisticas` con credenciales del proyecto correcto y `SG_ESTADISTICAS_PROYECTO=xkfiawkixcyzpfdwccxz`. La prueba SQL aislada cubre instalación nueva, actualización desde el esquema antiguo y exclusión de administradores activos/inactivos.

La implementación anterior exigía consentimiento explícito y la elección estaba disponible solo en el footer; sin aceptación no se creaban eventos. Se reemplaza por contadores diarios agregados sin cookies de seguimiento, identificadores de persona/sesión, IP ni eventos individuales. La API acepta solo dimensiones cerradas y códigos de catálogo; no acepta URLs privadas, parámetros UTM, búsquedas o datos de formularios. No se generan cifras de visitantes únicos ni sesiones. Meta Pixel mantiene permiso separado. La autorización se usa únicamente para excluir administradores, sin persistir su identidad en estadísticas. El endpoint anterior de eventos individuales queda retirado y el permiso de su RPC se revoca para clientes del navegador.

La API pública valida origen, límites de cuerpo y rol; el incremento SQL requiere la credencial privada del servidor. El límite global de ráfagas por instancia es una protección complementaria, no un filtro completo de bots ni una garantía de medir todo el tráfico. Los proveedores de infraestructura pueden mantener registros técnicos fuera de estos contadores. No hay eventos históricos conservados en producción para reconstruir el tráfico que no se guardó. Sin cambios en producción en esta iteración.

El registro nuevo usa `/api/estadisticas` y las funciones `registrar_conteo_anonimo`, `resumen_estadisticas_agregadas_panel` y `popularidad_productos_agregada_panel`. El permiso de incremento queda reservado a `service_role`, únicamente desde el servidor, mientras el panel consulta resúmenes con la sesión administrativa. El contador de productos alimenta también la popularidad agregada usada en recomendaciones. `npm run verificar:estadisticas` comprueba estos contratos antes de publicar. El esquema anterior continúa pendiente en producción: esta iteración no ejecuta migraciones remotas ni despliegue.

Referencia de alcance: artículos 3 y 5 de la [Ley 8968](https://www.pgrweb.go.cr/DOCS/NORMAS/1/VIGENTE/L/2010-2019/2010-2014/2011/1153F/DCEF7.HTML). No se interpreta como una autorización general para guardar cualquier dato sin consentimiento; la decisión técnica reduce los datos almacenados a contadores agregados sin identificación individual. La publicidad permanece separada y opcional.

## Matriz de auditoría integral — 22 de octubre de 2026

Esta matriz describe cobertura y riesgos; no certifica el 100 % del producto. Un archivo existente o un caso omitido no cuenta como una prueba aprobada. La autorización del usuario de esta ronda permite ejecutar pruebas aisladas sin pedir confirmación adicional. No autoriza cobros, mensajes reales, publicación ni cambios en producción. Los workflows de regresión siguen siendo manuales.

Base revisada: carpeta de trabajo local (con cambios anteriores pendientes). Difiere de la publicación `d94f849`: particularmente el soporte externo. No atribuir los resultados locales a producción ni publicar todos los cambios del directorio como parte de esta auditoría.

| Sección | Prioridad | Cobertura / bloques ejecutables | Riesgo o límite que debe conservarse visible |
|---|---|---|---|
| Inicio y navegación | P1 | `inicio-movil`, `regresion`: imágenes, menús, contadores, carga, idioma | Medir primera carga y caché; emulación no sustituye un teléfono físico |
| Tienda y búsqueda | P1 | `catalogo`, `regresion`: búsqueda, paginación, orden, rutas y precios | Revisar datos nuevos del proveedor sin depender de producción |
| Filtros | P1 | `regresion`: confirmación, cancelación, jerarquía, rango contextual, scroll | No aplicar cambios de fondo al cerrar el panel móvil |
| Ficha y disponibilidad | P1 | `modales`, `disponibilidad`, `catalogo` | Fotografías y stock de catálogo real requieren auditoría de catálogo separada |
| Empresas y software | P0 | `software`, `regresion`: productos cruzados, bajo pedido, cantidades | Stock del proveedor no equivale a inventario propio |
| Favoritos y carrito | P1 | `regresion`, `sql-favoritos`, `sql-favoritos-empresariales` | Aislamiento por cuenta, persistencia, fusión, contadores sin parpadeo |
| Cuenta del cliente | P0 | `google`, `codigo`, `cuenta-panel`, `mfa-clientes`, `sql-autogestion-cuenta`, `sql-perfiles-compra` | OAuth simulado no certifica proveedor Google real |
| Administración y MFA | P0 | `mfa-clientes`, `sql-mfa-administradores`; workflow manual `mfa-admin.yml` | MFA nativo exige Supabase/Auth exclusivo; no sustituirlo por mocks |
| Formulario de compra | P0 | `checkout-pasos`, `tilopay-hosted`, `privacidad` | Persistencia al visitar términos, expiración, duplicados, validación en servidor |
| Entrega y facturación | P0 | `privacidad`, `plazo-panel`, `integracion-plazo-correos`, `entrega` | La prueba no certifica emisión fiscal real ni cumplimiento de transporte |
| Tarjeta y conciliación | P0 | `integracion-conciliacion-tarjeta`, `integracion-retiro-pago`, `sql-conciliacion-tarjeta`, `conciliacion` | Sin retorno, consultas fallidas, importes/ambientes, concurrencia, atrasos; webhook pendiente de Tilopay |
| SINPE y transferencia | P0 | `comprobantes`, `entrega`, Worker aislado | MIME, tamaño, acceso privado, confirmación manual; nunca aprobar solo por adjuntar archivo |
| Pedidos administrativos | P0 | `entrega`, `referencias`, `software`, `sql-pedidos-archivo-express`, `sql-estado-entrega`, `sql-archivo-panel` | Intentos no pagados fuera de preparación; archivo conserva historial |
| Correos | P0 | `correos-diseno`, `empresas-correo`, `integracion-plazo-correos`, `integracion-conciliacion-tarjeta` | Captura local demuestra contenido/reintentos; no entrega real en Brevo o bandeja del destinatario |
| Catálogo y proveedores | P1 | `contenido`, `eurocomp-manual`, `sql-eurocomp-manual`, `catalogo` | Sincronización y publicación con fixtures; auditoría de fotos independiente |
| Contenido y páginas | P1 | `contenido`, `inicio-movil`, `modales`, `fondos`, `regresion` | Verificar textos ES/EN, accesibilidad y páginas vacías |
| Usuarios y permisos | P0 | `sql-usuarios-panel`, `sql-seguridad-archivo`, `cuenta-panel` | RLS entre usuarios, cambios de rol y cuentas desactivadas |
| Estadísticas | P0 | `estadisticas`, `exclusion-admin`, `sql-estadisticas-panel`, `sql-popularidad-catalogo`, `sql-popularidad-productos` | Excluir admin después de logout; incógnito no reconoce identidad previa |
| Campañas y Meta | P0 | `integracion-campanas-contrato`, `integracion-campanas-transporte`, `sql-campanas-conversiones` | Colas, revocación, duplicados, campos permitidos; simulación no prueba atribución real |
| Privacidad y seguridad | P0 | `privacidad`, `catalogo` (límites/secretos), `verificar`, SQL de permisos | Borradores, aceptación, logs, secretos; revisión técnica no es certificación jurídica |
| Infraestructura | P0 | `build`, Worker aislado en workflow, SQL, `inventario` | Cadena completa de migraciones/cron real se revisa aparte; no usar base compartida |
| Soporte técnico | P1 | `soporte`: interfaz integrada; `sql-soporte-panel` | Esta publicación conserva el módulo integrado. El cambio local al sistema externo queda fuera hasta disponer de hosting. |
| Contenedor móvil | P2 | `mobile-preview` | Preview web no certifica binario iOS/Android, teclado físico, distribución ni atribución nativa |

### Ajustes de esta ronda

- Registro central de bloques en `scripts/testing/bloques.mjs`; consultar con `node scripts/testing/regresion.mjs --list` sin iniciar servidores.
- Incorporación a regresión y CI manual de conciliación, privacidad, exclusión administrativa, MFA de clientes, software, referencias, plazos, contratos de campañas y pruebas SQL pendientes.
- Prueba del inventario: detecta comandos inexistentes, nombres duplicados y desconexión de bloques críticos del workflow manual. Excluye diagnósticos reales de Meta, smoke de producción y MFA nativo del ejecutor sin servicios dedicados.
- Corrección de dos pruebas SQL que necesitaban una variable local no documentada para encontrar PGlite.
- Corrección de la prueba de Google/MFA que esperaba el checkbox ya retirado del login; ahora exige su ausencia.
- Corrección del selector ambiguo en conservación del checkout: el botón se identifica por función y etiqueta traducida, no por todos los submit incluidos en pasos ocultos.
- Se conservan las pruebas de interfaz y SQL del soporte integrado en la publicación. El reemplazo externo de la carpeta original no se incluye ni se presenta como desplegado.

### Límites, pendientes y criterio de cierre

1. Cada ejecución guarda código de salida, casos aprobados/fallidos/omitidos/inestables y logs en `.privado/regresion/<fecha>/`. No contar omitidos como aprobados.
2. Los mocks, SQL efímero, MFA nativo, Worker y producción son niveles distintos. Solo cerrar un riesgo con evidencia del nivel requerido.
3. La regresión global de GitHub requiere que el bloque esté publicado en una rama autorizada; esta tarea no incluye push/despliegue. Los cambios locales anteriores deben separarse antes.
4. Los casos con `test.skip` condicional se revisan con su fixture correspondiente. No quitar la protección para forzar pruebas contra servicios reales.
5. Evitar ejecutar dos configuraciones de navegador simultáneamente: comparten `.next-pruebas`. No reiniciar ni migrar la base local compartida.
6. Webhook de Tilopay, entrega real de correo, 3DS real, binarios móviles y atribución publicitaria permanecen fuera de la certificación aislada.

### Inventario y pruebas retiradas

El descubrimiento inicial encontró 142 archivos `.spec.ts`: 86 seleccionados por los bloques registrados y 56 fuera de ellos. Esto **no es un porcentaje de cobertura**. Se añadió `publicas` para conectar activación vencida, enlaces de pedido, WhatsApp, páginas legales, cuenta sin proveedor y protocolo Eurocomp. El inventario reproducible se obtiene con `node scripts/testing/auditar-cobertura.mjs` y queda en `.privado/evidencias/inventario-testing.json`.

Cuatro contratos obsoletos se conservaron como texto en `tests/legado`, fuera de la ejecución y compilación: OAuth social/PKCE anterior, checkout PKCE anterior, analítica con cookie antigua y subcategorías que aplicaban cambios con Escape. `tests/legado/inventario.json` documenta el motivo y las pruebas sustitutas. No se retiraron pruebas simplemente por fallar.

La restauración de un intento de compra ahora debe volver a **Intentos**, no a **Por atender**. Se actualizó ese caso de archivo/restauración para comprobar el comportamiento vigente y conservar las verificaciones de importe, motivo y estado pendiente.

Inventario después de los ajustes: **138 archivos activos, 92 conectados a la regresión general y 46 clasificados fuera de ella**, más cuatro históricos retirados. La clasificación individual y acción propuesta están en `scripts/testing/revision-casos.json`. Los 46 incluyen laboratorios específicos y candidatos a consolidación; no se declaran ni aprobados ni obsoletos sin evidencia. MFA nativo dispone de workflow propio. Incorporarlos todos sin adaptar sus datos/fixtures podría modificar archivos compartidos y dar resultados engañosos.

Se añadió además una prueba directa de los endpoints de publicidad con exclusión persistente: no se crea contexto, no se admite evento publicitario después del cierre de sesión y el navegador no puede declarar `Purchase`. Ejecutada en ambos idiomas y proyectos PC/móvil, sin contactar Meta.

### Resultado de la ronda dirigida

- 211 casos de Playwright aprobados en los bloques ejecutados (incluye comprobaciones de lógica y navegador; PC/Safari móvil y ES/EN donde corresponde).
- 18 bloques SQL efímeros y cinco bloques de integración aislada aprobados.
- Cuatro pruebas del inventario aprobadas. Tipos, lint, 2423 claves traducidas, secretos, build y revisión de 1386 assets públicos aprobados.
- Se corrigieron las expectativas antiguas y se repitieron los bloques afectados: la última ejecución de cada bloque terminó sin fallos ni omisiones. Los primeros fallos/interrupción permanecen en los reportes para trazabilidad.
- No se ejecutó la regresión completa de GitHub, MFA nativo, Worker integral ni comprobaciones de producción en esta ronda. No hubo cobros, correos reales, push ni despliegue.
- Evidencia consolidada: `.privado/evidencias/auditoria-testing-2026-10-22.json`; reportes individuales referenciados allí.

### Ampliación: frontend, inglés, seguridad y carga (23/10/2026)

- Next y eslint-config-next actualizados de 16.3.8 a 16.4.2 tras los avisos GHSA-673q-mjm6-r5xr y GHSA-p3m5-59mp-jv5r. El segundo afecta App Router con Server Actions. No se observó ni se afirma una intrusión. `npm audit --omit=dev` devuelve cero vulnerabilidades; permanece el aviso conocido de braces en herramientas de desarrollo, sin parche.
- `/admin` y sus subrutas incluyen `no-store` y `no-referrer`. Las pruebas comprueban MFA/activación sin guardar páginas sensibles en caché.
- Las actualizaciones del catálogo mantienen productos existentes, incluso ante errores de red. Las consultas anteriores se cancelan y una consulta colgada termina a los 15 segundos, con recuperación manual; no hay reintentos infinitos.
- Volver a la pestaña dentro de 30 segundos no refresca otra vez; eventos de conexión repetidos se agrupan. Esto no impide actualizar al cambiar filtros.
- Skeletons visibles y con movimiento reducido; se muestran cuando aún no hay contenido, sin sustituir el contenido ya cargado. Se revisaron capturas en escritorio y Safari móvil, ES/EN.
- Nuevo bloque manual `frontend`: seguridad pública, cargas, red fallida, navegación e idioma persistente. `integracion-catalogo-red`: transporte colgado, cancelación y error HTTP. Se reemplazó la expectativa obsoleta de vaciar el catálogo al buscar por la conservación del contenido.
- Los tiempos recogidos en los adjuntos de Playwright son de desarrollo local, incluyen compilación y no equivalen a Core Web Vitals de producción. No se garantiza seguridad absoluta ni cobertura visual exhaustiva de cada combinación del panel. Las imágenes externas siguen dependiendo del proveedor; no se cambiaron fotos ni se inventaron optimizaciones de esos servidores.
- Cambios locales, pendientes de autorización para publicar. No se ejecutaron cobros, envíos reales ni pruebas en producción.

Resultado de este bloque: 22 casos de navegador, 3 de transporte y 4 de inventario aprobados; sin omisiones ni casos intermitentes en la ejecución final. `verificar`, build Next y build OpenNext Cloudflare completados. Evidencia local: `.privado/evidencias/frontend-2026-10-23.json`.

### Matriz ampliada de compras (22/10/2026, Costa Rica)

`compras-matriz` cruza SINPE, transferencia y tarjeta con retiro, Correos y Express; invitado y sesión de cliente; español e inglés; Chrome de escritorio y Safari móvil: 72 combinaciones. Comprueba selección, datos y dirección, totales de envío, avance, revisión, aceptación, envío único y comprobante cuando corresponde. Incluye además acciones de favoritos, vista previa y carrito. Las respuestas de creación se interceptan en memoria del navegador: esta capa valida el frontend, no demuestra un cargo bancario real.

La capa de servidor `integracion-retiro-pago` se amplió a los tres métodos y modalidades en ambos idiomas (18 escenarios). Ejecuta las rutas reales con servicios HTTP exclusivamente locales; comprueba totales calculados por el servidor, pagos pendientes frente a confirmados, avisos capturados y rechazo de reutilización de la aprobación. La conciliación añade ausencia de retorno del cliente, fallos, discrepancias, reintentos y duplicados. SQL comprueba permisos y transiciones en PostgreSQL efímero.

Separación y limpieza:
- El ejecutor vacía explícitamente credenciales de producción heredadas; los fixtures reemplazan solo las necesarias con valores sintéticos y URLs loopback.
- Los contextos de navegador son nuevos por caso; cookies, carrito y borradores no se comparten con el navegador personal.
- Las tablas de fixtures viven en memoria; PGlite es efímero. Al terminar sus procesos no quedan pedidos ni correos simulados.
- Las sesiones y archivos de administración de `.privado/contenido-pruebas` se eliminan por teardown. Se conservan únicamente pruebas y reportes para repetición y diagnóstico.
- No se borran pedidos existentes ni se conecta a producción para limpiar. Las pruebas contra Supabase Auth real y el Worker con Supabase local requieren Supabase local real (Docker en CI o runtime nativo en Mac); no confundir sesiones simuladas con esa cobertura.

Casos obsoletos corregidos: una pestaña independiente ya no debe recibir el borrador con datos personales; se mantiene el carrito compartido. El archivado espera la confirmación y el registro guardado, no un `networkidle` global que puede no llegar por conexiones de desarrollo.

Hallazgo funcional de esta ronda: el resumen y el botón podían presentar un total parcial (incluido ₡0) durante la recuperación del carrito. Ahora ambos usan el estado traducido «Por confirmar» hasta contar con todos los productos; continuar permanece bloqueado. La nueva prueba retiene la respuesta de precios y comprueba la transición al total correcto.

La entrega digital y las 30 licencias bajo pedido se cubren en `software`, además de la matriz física de 72 combinaciones. La confirmación bancaria real y Supabase Auth/Worker real no se sustituyen por los mocks: siguen siendo límites explícitos de la ejecución local.

Resultado final: 247 casos Playwright aprobados, 0 fallidos y 4 omitidos por requerir Supabase Auth real en esa primera ejecución. La matriz nueva aporta 72 combinaciones, 4 casos de precios durante carga y 4 de acciones de producto. Pasaron además los cuatro bloques SQL seleccionados, conciliación, correos y la matriz ampliada de 18 escenarios de servidor. Las primeras ejecuciones con expectativas antiguas se conservan como diagnóstico; las repeticiones corregidas no presentan fallos.

Limpieza comprobada al finalizar: ausentes `.privado/contenido-pruebas` y `public/imagenes/admin-contenido-pruebas`; cerrados los puertos de fixtures 3126, 3130, 3134, 3135 y 3167. No se crearon pedidos en producción. Evidencia consolidada: `.privado/evidencias/compras-matriz-2026-10-22.json` y reportes enlazados en ese JSON. No se hizo push ni despliegue.


## Cierre de Auth real — 23 de octubre (UTC)

`playwright.auth-real.config.ts` ejecuta los cuatro casos de ingreso con Supabase Auth real, en español/inglés y Chrome/WebKit móvil. Exige URL local exacta y claves locales; crea una cuenta de cliente nueva por caso, siembra únicamente su perfil de compra y elimina la cuenta al terminar, comprobando que su perfil desaparezca por cascada. No reutiliza administradores ni contraseñas preparadas a mano. El workflow manual ejecuta este bloque antes del Worker sobre su Supabase efímero.

La ausencia de Docker en Mac no implica ausencia de Supabase: el laboratorio anterior utiliza el runtime nativo. No iniciar ni detener indiscriminadamente otros laboratorios; verificar primero sus puertos. La limpieza de cada prueba debe limitarse a sus propios registros.

Resultado de Auth: 4/4 aprobadas, sin omisiones, y cero cuentas `qa-ingreso-` residuales. Evidencia privada: `.privado/evidencias/auth-real.json`.

La ejecución del Worker encontró un fallo que la compilación no detectaba: OpenNext 1.20.6 no incluía `server/preview-props.json` de Next 16.4 y respondía HTTP 500. Se actualizó a OpenNext 1.20.13, que incorpora el soporte oficial (https://github.com/opennextjs/opennextjs-cloudflare/pull/1356). El build exitoso anterior no se considera evidencia de ejecución correcta del Worker.

La limpieza del Worker ahora comprueba los errores de Supabase y utiliza un identificador de producto único por ejecución. Meta permanece desactivado y sus credenciales se excluyen del entorno heredado.

Cierre: se creó una instancia nativa exclusiva en `127.0.0.1:55321`, con todas las migraciones desde cero. Auth pasó nuevamente 4/4 y el Worker compilado completó 12 pedidos, 2 tarjetas simuladas y 32 correos capturados, sin cargos ni compras al proveedor. La limpieza confirmó cero pedidos manuales, tarjetas, solicitudes, perfiles de compra y usuarios. Después se destruyó la instancia exclusiva, conservando únicamente los informes de evidencia. El laboratorio anterior no se destruyó ni se reparó su historial de migraciones.

Dependencias finales: Next 16.4.2, OpenNext 1.20.13 y Wrangler 4.152.0. Se fija `glob` 10.5.0 solamente para `@node-minify/core` por GHSA-5j98-mcp5-4vw2; revisar este override cuando el proveedor actualice su dependencia. Auditoría de producción: cero alertas. Permanece la excepción documentada de `braces` en herramientas de desarrollo, sin parche disponible.
