# Campañas y conversiones de SG Solutions

Este documento describe la medición y su historial. El código revisado el 31 de octubre de 2026 requiere una preferencia de publicidad afirmativa; las notas históricas de activación automática no describen el comportamiento actual. No interpretar la presencia de código como recepción de Meta ni como atribución a anuncios. Las correcciones del 31 de octubre se publicaron como 5b9aa3a; CI y las seis lecturas de producción pasaron. La versión Cloudflare fue c4f99752-1e76-47fc-b9f0-95d2374e5c08. La etiqueta del anuncio se guardó y el 1 de noviembre Meta mostró entrega Activa.

## Dos alcances

- Contadores propios: totales diarios de páginas, productos, clics, búsquedas sin texto, búsquedas sin resultados, cambios del tipo de filtro y formularios. No incluyen identificadores de personas, cuentas, sesiones, IP, mensajes ni historial individual. La cantidad de cierres de formularios es aproximada: se observa que el formulario se retire sin envío mientras la página sigue activa; no reconstruye abandonos fuera de línea.
- Atribución publicitaria: requiere `publicidad === true` en las preferencias reconocidas. `sg-publicidad` es HttpOnly, firmada, SameSite=Lax y Secure en producción. Caduca a los 30 días del primer permiso, sin extenderse en cada visita. Contiene un ID técnico, fbp, fbc cuando existe clic de Meta, primer origen y reciente. Es seudónima, no anónima. No se vincula a la cuenta. Un navegador compartido puede compartir esta atribución.
- Sin preferencia guardada se muestra el aviso. Rechazar publicidad impide el envío publicitario; no aceptar tampoco habilita Meta. La medición agregada del navegador requiere por separado `analitica === true`. Los hitos operativos del servidor tienen su propia elegibilidad. Ninguna de estas métricas representa todos los visitantes necesariamente.
- Los códigos `utm_campaign` se aceptan solo si están en `SG_CAMPANAS_PERMITIDAS`. Fuente/medio usan listas cerradas. Facebook/Instagram de referencia no significan anuncios pagados. UTM desconocida no se publica como campaña pagada verificada; los valores declarados no demuestran por sí mismos un clic pagado real.
- La atribución permite contar conversiones por campaña, no calcular ROAS ni costo de adquisición sin importar gasto real de anuncios. No se atribuyen conversiones históricas sin contexto permitido.

## Hechos y eventos

| Hecho | Interno | Meta con medición activa y configuración |
| --- | --- | --- |
| Vista pública | Página agregada; origen con medición activa | PageView |
| Ficha / carrito | Producto validado | ViewContent / AddToCart |
| Búsqueda | Cantidad y resultado vacío, sin término | Search, sin texto |
| WhatsApp | Clic, no conversación | WhatsAppClick, evento personalizado |
| Correo / teléfono | Clic, no contacto confirmado | ContactClick, evento personalizado |
| Revisión válida de compra | Intento, no pedido pagado | InitiateCheckout |
| Asesoría/empresa persistida | Solicitud recibida | Lead desde servidor |
| Enlace de compra preparado | Cotización preparada, no enviada | Ninguno |
| Pedido creado | Pedido pendiente | Ninguno |
| Pago confirmado en servidor | Pago confirmado | Purchase, CRC e importe confirmado |

Las solicitudes de empresa se guardan en un buzón operativo privado con sus datos de contacto; no son filas de analítica. El correo tiene reserva atómica y reintentos limitados. Un fallo de correo no borra la solicitud recibida. Los contadores de operaciones usan claves HMAC para deduplicación, no IDs de visitante. No se expone al navegador la cola ni su información técnica.

La página de estadísticas muestra campañas, primer origen, embudo y estados: pendiente, enviando, aceptado, suprimido, expirado. Aceptado solo significa `events_received=1` en una respuesta correcta de Meta: no certifica coincidencia, atribución, entrega de anuncios ni ventas adicionales.

## Exclusión y permisos

La exclusión administrativa existente se mantiene en PC/móvil, se revisa al navegar/volver al foco y persiste tras cerrar sesión en ese navegador. Los endpoints publicitarios vuelven a comprobar el rol; ante errores no crean atribución ni eventos. Al marcar un navegador administrativo se revoca su contexto publicitario. No se puede reconocer a un administrador anónimo en un navegador nuevo, privado o con almacenamiento borrado.

Los pedidos se capturan con la elegibilidad original. La confirmación de un cliente normal por un operador administrador puede contar la venta; no cuenta la navegación del operador. Antes de Purchase se comprueba el pedido pagado, entorno y si el correo operativo pertenece ahora a un administrador, sin copiar esa identidad a Meta. Un pedido antiguo sin captura no recibe una atribución inventada.

Los manuales nuevos en entornos locales son `pruebas`. La migración conserva los manuales históricos como producción: no es posible clasificar de forma segura las pruebas antiguas automáticamente. Esa revisión debe hacerse antes de asegurar que todo el histórico representa ventas reales.

Todas las tablas nuevas tienen RLS y sin acceso público. Solo el servidor escribe; el resumen y el buzón operativo requieren administrador con MFA. El endpoint de navegador no admite Lead o Purchase. No se enviarán nombres, correos, teléfonos (ni hashes), identificación, dirección, IDs de cuenta/pedido, búsquedas, mensajes, URLs completas, IP del visitante ni cabeceras arbitrarias a Meta. Meta recibe la conexión del servidor y los identificadores publicitarios permitidos.

## Reintentos y retención

- Cola única por evento. Purchase solo sale por servidor; no hay una copia de Pixel que deba deduplicarse contra el navegador. Los reintentos conservan `event_id`.
- Reserva SQL con `FOR UPDATE SKIP LOCKED`, token de reserva y recuperación después de 10 minutos. Hasta cinco intentos y máximo 48 horas o vencimiento del contexto.
- Los errores 4xx definitivos expiran; 429, red y 5xx se reintentan con espera creciente. No se registran respuestas con datos de Meta, tokens ni payloads en logs.
- Al revocar se suprimen pendientes y se retira el contexto de operaciones. No se pueden retirar envíos ya recibidos ni cancelar con certeza un envío que ya esté en curso.
- IDs técnicos se eliminan de la cola al terminar. Cola y contexto de operaciones se depuran a los 30 días. Las revocaciones duran 31 días; los agregados conservan 30 días. El buzón operativo no es analítica y conserva la solicitud para su gestión.
- Worker programado cada 15 minutos, con secreto independiente y binding interno. Si falta el secreto, no ejecuta tareas. El panel dispone de procesamiento manual protegido por MFA. Sin un procesador operativo, los registros no desaparecen únicamente por el transcurso del reloj.

## Activación

1. Autorizar y ejecutar las pruebas aisladas, SQL y visuales ES/EN en PC/móvil. No enviar tráfico de prueba a Meta sin autorización aparte.
2. Aplicar `20261020000100_campanas_conversiones_privadas.sql` en el proyecto correcto.
3. Verificar propiedad del dataset SG Solutions en Meta Business. No reutilizar ContrataCR.
4. Configurar únicamente en servidor: `META_DATASET_ID`, `META_ACCESS_TOKEN`, `META_GRAPH_VERSION` (versión vigente admitida), `SG_CAMPANAS_PERMITIDAS`, `SG_MEDICION_PROCESADOR_SECRET` (32+ caracteres). No usar NEXT_PUBLIC para tokens. Crear credenciales nuevas requiere la aprobación correspondiente de acceso; no pedir tokens por chat.
5. Mantener `SG_META_ACTIVO=0` hasta autorizar la activación. `1` más los datos válidos habilita salida real, exclusivamente en producción.
6. Publicar solo cuando el usuario lo solicite, comprobar CI y pedir aprobación separada para smoke/recepción de Meta.

No cambia ajustes de Meta Business, coincidencia avanzada, permisos ni datasets por sí mismo. No hay SDK nativo ni SKAdNetwork en este bloque.

## Validación aislada autorizada (20 de octubre de 2026)

- Contrato de campañas y firma: `node --conditions=react-server --import tsx --test tests/integracion/campanas-contrato.mts`.
- Transporte de Meta completamente interceptado, sin salida de red: `node --conditions=react-server --import tsx --test tests/integracion/campanas-transporte.mts`.
- Migración y permisos en PostgreSQL efímero: `node tests/sql/campanas-conversiones.mjs`. Incluye deduplicación, reservas, cinco intentos, reserva vencida, revocación, aislamiento, MFA y pedidos de pruebas/administradores.
- Navegadores: `playwright.exclusion-admin.config.ts` y `playwright.estadisticas.config.ts`, PC y Safari móvil, español e inglés. Los selectores del panel se limitan a la página visible porque Next conserva páginas anteriores ocultas durante la navegación.
- Comprobado: exclusión después de cerrar sesión, otra pestaña abierta, errores al consultar el rol, preferencias separadas, ausencia de Pixel, contratos HTTP restringidos, panel de campañas, persistencia de idioma y ausencia de desbordamiento de página.

Estas ejecuciones no aplican SQL en producción, no envían eventos reales a Meta ni autorizan activarlo. Se mantienen como pruebas manuales que requieren confirmación del usuario. La migración y la configuración de secretos siguen pendientes de publicación autorizada.


## Verificación en Meta Business (20 de octubre de 2026)

Verificado en la sesión de Edge: dataset **SG Solutions - Sitio web**, ID `1837501974261618`; propietario **SG Solutions**, portfolio `537952729962735`; cuenta publicitaria SG Solutions `1998397363653982`. La configuración identifica a Luis Sánchez como creador. No se usó el portfolio ni el dataset de ContrataCR.

Se desactivaron y se confirmó el estado guardado de las coincidencias avanzadas automáticas (incluidos correo, teléfono y otros campos personales) y los detalles automáticos de páginas/productos. Los eventos automáticos y el seguimiento automático sin código ya estaban desactivados. La selección de integración quedó sin Dataset Quality API, para evitar el permiso adicional sobre tokens anteriores.

La credencial fue generada después de que el usuario completó la verificación del correo del perfil. Se guardó únicamente como `META_ACCESS_TOKEN` del Worker `sgsolutions` mediante Wrangler; no se incluyó en código, logs ni capturas. El archivo temporal de transferencia se eliminó. También se guardaron `META_DATASET_ID`, `META_GRAPH_VERSION`, `SG_META_ACTIVO=0` y un secreto independiente `SG_MEDICION_PROCESADOR_SECRET`. Se comprobó la presencia por nombres, sin leer los valores cifrados.

Versión fijada: `v25.0`, disponible tanto en Graph API como en Marketing API según la [tabla oficial de versiones de Meta](https://developers.facebook.com/docs/graph-api/changelog/versions/), consultada en Edge el 20 de octubre de 2026. No se generó permiso adicional de Dataset Quality API.

Pendiente de autorización de publicación: aplicar la migración en Supabase, push y despliegue del código, habilitar el procesamiento programado y activar `SG_META_ACTIVO=1`. No se ejecutaron consultas de prueba en producción ni eventos reales a Meta. El almacenamiento del secreto actualizó la configuración del Worker existente; no publicó el código local pendiente.


## Publicacion autorizada el 21 de octubre de 2026

La transaccion de la migracion termino con Success en SG Solutions Produccion. El usuario autorizo push, despliegue y activacion de Meta. Los secretos ya estan guardados; SG_META_ACTIVO se habilitara despues de los checks y del despliegue. No se autorizaron pruebas nuevas ni eventos de prueba.

## Diagnóstico dirigido de la cola

`SG_META_PRUEBA_COLA` es una configuración exclusiva del servidor, vacía por defecto. Su JSON admite solo `id` (43 caracteres del evento sintético), `codigo` (`TEST` seguido de dígitos de Meta) y `vence` (milisegundos, dentro de la siguiente hora). Solo el `PageView` de `/` con ese identificador recibe `test_event_code`; ningún otro evento se convierte en prueba. No se aceptan estos controles desde el navegador ni se modifica el esquema SQL. Después de la comprobación autorizada, retirar la configuración. Encolar únicamente datos sintéticos, comprobar el resultado persistido y la recepción del mismo ID en Meta; una respuesta HTTP del procesador por sí sola no demuestra entrega.

## Investigación de atribución del 31 de octubre de 2026

### Evidencia y alcance

Revisión del árbol `2f59c0b`, historial Git, rutas, consentimiento, exclusión administrativa, contratos HTTP, cola SQL y transporte CAPI. Lectura de Meta en Edge, sin publicar cambios ni enviar eventos. Las cifras históricas no se vuelven actuales por conservarse en este registro.

- El anuncio `120252177653460371` de la campaña `120252177653470371` usa una publicación existente de Instagram de 52 segundos. La vista previa dice «Tienda | SG Solutions» / «Más información», URL de origen `https://sgsolutionscr.com/tienda`, optimización automática de destino desmarcada, dataset `1837501974261618`.
- Parámetros observados en el anuncio: `utm_source={{site_source_name}}&utm_medium=paid_social&utm_campaign=sg_video_20261023`. La etiqueta es compartida con la campaña anterior: no permite separar su histórico con certeza. No se modificó durante esta revisión.
- Meta mostraba la campaña de Ventas activa y las dos anteriores desactivadas. No se cambió presupuesto, objetivo, entrega, Reel ni dataset.
- En PageView, intervalo mostrado 3–30 octubre, Meta presenta calidad de coincidencia 2,5/10, cobertura fbp 100% y aviso de que el servidor no está enviando fbc. Diagnóstico general muestra «No hay errores en este momento». Son indicadores distintos: recepción sin errores no demuestra atribución.
- El conjunto de datos incluye `127.0.0.1` entre sus orígenes históricos. Esto exige distinguir datos históricos de desarrollo y datos actuales antes de usar el total como tráfico comercial. No se eliminó historia ni se concluyó que la aplicación actual envíe eventos desde desarrollo.

### Hallazgos del código

1. **Recepción y atribución se verificaron por separado de forma insuficiente.** El diagnóstico Purchase prueba el envío de un evento sintético a Probar eventos, no una compra pagada, una llegada desde el anuncio ni su atribución. `aceptado` en la cola significa una respuesta técnica de Meta, no una venta ni una coincidencia con un usuario del anuncio.
2. **No hay Pixel del navegador en el código actual.** `iniciarPixel` no hace nada; los eventos salen por servidor. La integración «Múltiple» de Meta contiene historia y no prueba la presencia actual de ambas vías. No se ha demostrado que este transporte alimente la columna exacta de visitas a destino en esta cuenta.
3. **Captura tardía del clic.** `sincronizarPublicidad` leía `location.search` después de esperar otra solicitud; además, la comprobación del rol era anterior. Una navegación durante la espera puede cambiar el origen leído. Esto es un defecto detectable por revisión, no una estimación del número de visitas perdidas.
4. **Eventos descartados al sustituir una sincronización.** Cada actualización de foco/página incrementaba la versión. La promesa anterior podía resolver `false` y el PageView que la esperaba se abandonaba, aunque la siguiente sincronización tuviera permiso. La ruta ya se marcaba como vista. Reproducido en copia temporal de HEAD: se enviaban cero eventos en lugar de uno. La corrección pasa el mismo caso aislado; no cuantifica el impacto histórico.
5. **Revocación y aceptación consecutivas.** Una petición más reciente podía omitir una revocación todavía en espera. La corrección preparada conserva esa revocación y evita reactivar eventos pendientes del permiso anterior.
6. **Consentimiento real distinto de documentación anterior.** Desde los cambios del 29 de octubre, publicidad y analítica del navegador requieren la preferencia correspondiente. Las personas que no aceptan publicidad no generan PageView para Meta; ese comportamiento se conserva. Si aceptan después de abandonar la URL inicial, no se recupera un clic que nunca se capturó con permiso.
7. **Identificadores limitados por diseño.** El servidor crea fbp en su contexto firmado y agrega fbc solo si recibe un fbclid válido. No reutiliza las cookies heredadas `_fbp`/`_fbc` ni recoge IP, agente de usuario, correo o teléfono. Un fbp presente no demuestra coincidencia; tampoco debe calificarse automáticamente de inválido por ser generado en servidor. No se amplía el contrato de datos en esta corrección.
8. **Filtros de tienda.** `urlConSeleccionTienda` conserva los parámetros ajenos a los filtros, incluidos los de adquisición. No se encontró allí una eliminación explícita de fbclid en la versión revisada. No equivale a comprobar redirecciones y navegadores integrados en producción.
9. **Métrica interna insuficiente para entradas.** `campana_visita` se registra por cada PageView y el agregado no guarda ruta. No significa visitante único ni llegada inicial a `/tienda`; su cantidad no debe compararse directamente con clics salientes ni etiquetarse como visitas a destino de Meta.
10. **Privacidad y administración.** Se revisan permisos en navegador y servidor, se conserva exclusión al cerrar sesión y se suprimen eventos revocados. Un administrador en un navegador anónimo nuevo no se puede reconocer automáticamente. Esto no se debe confundir con poder excluir sus clics en los informes publicitarios de Meta.

### Correcciones preparadas localmente

- Captura de origen/clic solo con consentimiento, antes de esperas asíncronas.
- Los eventos esperan la sincronización vigente cuando otra la sustituye; una revocación invalida los pendientes incluso si después se vuelve a aceptar.
- Las revocaciones encoladas no se omiten por una aceptación posterior.
- Lista permitida ampliada con `sg_ventas_tienda_20261028`, conservando `sg_video_20261023` y su historia. No cambiar aún el anuncio: publicar primero el soporte web tras validar y registrar la hora del cambio para separar únicamente las visitas futuras.
- Documentación actualizada sobre consentimiento y límites de las métricas.
- `tests/integracion/publicidad-cliente.mts`, ejecutado con autorización explícita, usa red totalmente interceptada: sustitución de sincronizaciones, conservación de clic, revocación seguida de aceptación, falta de permiso y exclusión administrativa.

### Validación local autorizada

El usuario autorizó «Sí, pruebas locales aisladas». Se ejecutaron `publicidad-cliente.mts`, `campanas-contrato.mts`, `campanas-transporte.mts` y `meta-prueba-cola.mts` con `node --conditions=react-server --import tsx --test`: **12 pruebas/subpruebas, 12 aprobadas, 0 fallos** (incluye la prueba contenedora). El transporte interceptado comprueba fbc exacto cuando está presente, su ausencia cuando no existe, respuestas fallidas, revocación y ausencia de los campos personales prohibidos. El contrato conserva ambas etiquetas de campaña.

Se ejecutaron además los dos escenarios de concurrencia contra una copia temporal del cliente de HEAD, sin modificar el worktree: ambos fallaron por aserción, demostrando la pérdida de PageView y la omisión de la solicitud `permitir:false`. La copia temporal se eliminó al terminar. No se hicieron conexiones a Meta ni a una base de datos, pedidos, cambios de campaña o escrituras de producción.

`npm run verificar` pasó después de ampliar las aserciones: tipos, lint, 2450 claves ES/EN y revisión heurística de secretos. `git diff --check` pasó. No se ejecutaron build, regresión completa, pruebas visuales ni smoke de producción en esta validación.

### Comprobaciones pendientes y criterio de cierre

1. Completado: pruebas aisladas de concurrencia, contrato y transporte, incluyendo fbc presente/ausente y campos prohibidos. No se usaron eventos reales para probar carreras de concurrencia.
2. Después de validar y obtener autorización de publicación: desplegar, comprobar checks y ejecutar solo el smoke autorizado. Actualizar la UTM del anuncio existente sin duplicar campaña ni cambiar el presupuesto.
3. Comprobar una llegada controlada a `/tienda` con consentimiento: captura del clic, cookie firmada, PageView en cola y recepción del mismo evento con fbc en Probar eventos. Requiere autorización específica de producción; no hacer clic en anuncios pagados propios para fabricar métricas.
4. Para demostrar llegadas a tienda independientemente del informe de Meta, preparar un agregado diferenciado por ruta y señal de campaña/clic, sin almacenar los valores de identificadores ni llamarlo visitantes únicos. El esquema actual no permite reconstruir esos datos pasados. Esta ampliación no está implementada en este bloque.
5. Revisar clics **salientes**, visitas atribuidas, ubicaciones y fechas iguales después del cambio. Confirmar con evidencia el funcionamiento de la columna de Meta; si CAPI no basta, evaluar Pixel de navegador consentido con contrato de privacidad y deduplicación antes de introducirlo. No activar automáticamente capturas de datos personales para subir la puntuación.

No se considera resuelto el incidente solo porque pase TypeScript, Meta acepte un evento o mejore la puntuación. Falta comprobar una llegada completa y distinguir la medición propia de la atribución reportada por Meta. Los datos históricos no permiten cuantificar hoy todos los clics que llegaron ni recuperar eventos no medidos.

### Fuentes primarias consultadas

- [Meta: Parameter Builder para Node.js](https://github.com/meta/capi-param-builder/blob/main/nodejs/README.md): persistencia consistente de fbc/fbp y envío en `user_data`. No se instaló el paquete.
- [Meta: Parameter Builder del navegador](https://github.com/meta/capi-param-builder/blob/main/client_js/README.md): captura asíncrona y mecanismos adicionales en navegadores integrados. No se incorporaron IP, cookies ni datos personales adicionales.
- [SDK oficial de Meta, UserData](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/serverside/user_data.py): fbc a partir de cookie o fbclid.
- Las páginas de developers.facebook.com devolvieron 429 y la ayuda de visitas a destino remitió a login; no se usan como evidencia de que CAPI por sí sola alimente esa columna.

## Bloque integral autorizado: medición de campañas, 31 de octubre

El usuario autorizó investigar, aplicar todos los cambios necesarios, probar y publicar este bloque. La entrega conserva el objetivo Ventas, el Reel existente, el dataset y el límite vigente; no autoriza ampliar el gasto ni crear compras/mensajes reales.

### Implementación adicional

- Reutilización en el servidor de `_fbp` y `_fbc` heredados válidos, únicamente después de comprobar permiso publicitario y elegibilidad administrativa. Formato estricto y antigüedad menor a 30 días; el clic explícito de la URL tiene prioridad. Una cookie heredada antigua no reemplaza un clic más reciente. No se añade Pixel de navegador, IP, correo ni teléfono.
- Nuevos agregados: `tienda_vista`, `tienda_vista_clic_meta`, `campana_carrito`, `campana_checkout`, `campana_whatsapp`. Cada evento mantiene su clave de deduplicación, origen y campaña; no se guarda el valor del clic en la tabla agregada. `tienda_vista` cuenta PageView de `/tienda`, no sesiones ni exclusivamente anuncios. `tienda_vista_clic_meta` cuenta presencia de contexto fbc, que puede proceder de una visita anterior; no certifica atribución Meta.
- Panel bilingüe con tarjetas de recorrido y explicación de estos límites. La tabla por campaña separa señales de las etiquetas antigua y nueva. WhatsAppClick sigue significando clic, no mensaje o cliente confirmado. Purchase continúa limitado a pago confirmado por servidor.
- Migración `20261031000100_recorrido_campanas.sql` aplicada en el proyecto `xkfiawkixcyzpfdwccxz`. Antes de modificar, se comprobó el hash de la función anterior; la migración aborta ante cambios desconocidos. Hash posterior `f45bcb89a6d9523202c1bd965450d451`, escritura anon/authenticated deshabilitada y service_role habilitada, verificados en Supabase. No se eliminaron ni reclasificaron registros.
- `glob` fijado en 14.0.3 para resolver los avisos en dependencias de compilación; se retiró el override anterior 10.5.0. Auditoría `npm audit --omit=dev --audit-level=low`: cero vulnerabilidades. Permanece un aviso moderado de minimatch en herramientas de desarrollo; no se fuerza una sustitución global incompatible de su API.
- Pruebas registradas en `scripts/testing/bloques.mjs` para repetición manual: `campanas`, `integracion-publicidad-cliente`, `integracion-recorrido-campanas`. No se activa una regresión completa automática.

### Evidencia local y criterios operativos

Pruebas de contrato, concurrencia, identificadores y transporte: 14 pruebas/subpruebas aprobadas. PostgreSQL efímero: migración, agregados, deduplicación, roles, revocación y exclusión administrativa aprobados. Navegadores: llegada consentida y sin permiso en ES/EN y escritorio/Safari móvil; panel, períodos, cambio/persistencia de idioma y anchura aprobados (12 casos). La prueba adicional de endpoints reales contra la base simulada pasó en ambos proyectos de navegador (2 casos) y cubre contexto firmado HttpOnly, conservación de fbclid, registro de vistas, rechazo de Purchase desde navegador y revocación. Todas las conexiones de esos ejercicios son locales o interceptadas, con Meta desactivado.

El build OpenNext/Cloudflare pasó tras actualizar dependencias, junto con tipos, lint, 2457 claves bilingües y auditoría de 626 archivos públicos. Los avisos de datos no disponibles del panel fueron respuestas intencionales de las pruebas de fallo.

Antes del cambio de UTM, publicar el código y verificar el commit en CI y el smoke de producción. La etiqueta futura es `utm_source={{site_source_name}}&utm_medium=paid_social&utm_campaign=sg_ventas_tienda_20261028`. Mantener el identificador del anuncio y registrar la hora del cambio; las series anteriores siguen bajo `sg_video_20261023`. Una edición del anuncio puede provocar revisión de Meta; no declarar que se evita o que se conserva exactamente su fase de aprendizaje.

Para evaluar captación, comparar períodos iguales: gasto y clics salientes de Meta, vistas de tienda por campaña, carrito, inicio de compra, contactos y pagos. No convertir clics WhatsApp en leads confirmados. Con el presupuesto actual, no dividir en múltiples conjuntos ni prometer un volumen de compras o salida de aprendizaje. El nuevo panel da evidencia para decidir después, sin atribuir falsamente tráfico histórico.

[Meta Blueprint: Optimize Meta Conversions API](https://www.facebookblueprint.com/student/activity/609643-optimize-meta-conversions-api) distingue coincidencia, cobertura, calidad, deduplicación y actualidad de eventos, y recomienda verificar el recorrido completo. Se mantiene la integración de servidor y el contrato de privacidad existente: añadir Pixel de navegador requiere revisar el envío automático de URL/metadatos, consentimiento y deduplicación; no se instala solo para hacer desaparecer un guion en una columna. La columna nativa «Visitas a la página de destino» sigue pendiente de evidencia de atribución real: las nuevas métricas propias no se presentan como equivalentes.


## Contactos comerciales y consentimiento claro — 2 de noviembre de 2026

Solicitud: aplicar recomendaciones y hacer push/despliegue. La autorización de pruebas de este bloque se solicitó por separado, según AGENTS.md; no confundir controles de tipos/lint/textos/build con pruebas funcionales.

- WhatsApp: al pulsar un enlace en una ruta pública se añade una referencia de sección (`SG-TIENDA`, `SG-EMPRESAS`, `SG-SOPORTE`, `SG-WEB`). Con permiso publicitario y elegibilidad se puede añadir `VENTAS-2810` o `VIDEO-2310`. Solo son etiquetas de campaña autorizadas: no se envían fbc, fbp, identificadores personales ni URLs con parámetros. El mensaje permanece editable. La conservación en memoria funciona durante la navegación; tras recargar sin parámetros puede faltar la campaña. Los enlaces abiertos desde el menú contextual pueden no incorporar la referencia; no se promete cobertura completa.
- Panel de estadísticas: registro manual de consultas efectivamente recibidas, canal, fecha, origen confirmado y etapa. Referencia interna única, confirmación explícita, marca de prueba/admin, validación de servidor y control de revisión para no sobrescribir cambios simultáneos. Las tarjetas y el desglose por origen excluyen pruebas. No se suman a solicitudes automáticas para evitar doble conteo; cerrado no significa pago confirmado.
- Base: nueva tabla `contactos_comerciales`, RLS habilitado, sin acceso directo de anon/authenticated. Toda lectura/acción pasa por MFA administrativo; no hay exportación automática a Meta. La migración se aplica sin tocar históricos.
- Privacidad: se corrige la discrepancia anterior: `Solo necesarias` activaba analítica. Ahora desactiva ambas categorías. Se ofrece `Solo estadísticas anónimas` explícitamente, además de aceptar todas y configurar. La versión v3 solicita nueva elección para preferencias antiguas ambiguas y respeta negativas. Puede reducir más los registros consentidos; no se presenta como una técnica para inflarlos.
- Contraste independiente: Cloudflare Dashboard pidió iniciar sesión; no se activó Web Analytics ni se insertó un beacon. La sesión OAuth de despliegue no se usa para extraer credenciales del navegador. La consulta de métricas de Cloudflare queda pendiente de acceso. Solicitudes de infraestructura no equivalen a visitantes humanos.
- Uso: al recibir una consulta, crear una referencia propia (por ejemplo CONSULTA-001), confirmar fuente solo con evidencia, actualizar la misma fila al calificar/cotizar. Revisar pagos en Pedidos. Comparar gasto y contactos de la misma campaña y período; los resultados comerciales requieren registro del equipo.

## Aviso y configuración — 3 de noviembre de 2026

- El primer aviso ofrece Configuración y De acuerdo. El texto explica antes del clic que De acuerdo activa analítica y publicidad; navegar o abrir Configuración no equivale a aceptar.
- Configuración mantiene solo las categorías existentes: necesarias, estadísticas y marketing con Meta. Las dos categorías opcionales aparecen preseleccionadas si todavía no hay una elección; abrir Configuración no activa la medición. La selección se aplica al pulsar Guardar o aceptar todas, y las elecciones guardadas se restauran sin sobrescribir negativas. Cada categoría tiene información desplegable. Guardar aplica exactamente sus estados y Aceptar todas habilita ambas.
- Se conserva el diseño de SG Solutions y la traducción español/inglés. No se agrega una categoría ficticia de contenidos externos o confort.
- La versión 2026-11-03-v1 reconoce las decisiones explícitas de 2026-11-02-v3 y mantiene las negativas históricas. No recupera permisos antiguos que la versión anterior había invalidado.
- En este bloque se ejecutan solo controles estáticos y compilación. No se ejecutan pruebas funcionales, visuales ni smoke sin autorización adicional.

## Investigación y borrador Lenovo 82XM — 5 de noviembre de 2026

Solicitud: comparar la publicidad anterior y promocionar la publicación de Instagram https://www.instagram.com/p/DfXgOwwsO26/ hacia https://sgsolutionscr.com/tienda/laptop-lenovo-ryzen-5-82xm. No se interpreta el presupuesto de campañas anteriores como autorización de gasto nuevo.

### Historial exportado de Meta

Cuenta 1998397363653982, período Máximo. CSV con fin de informe 2026-11-05, incluyendo campañas eliminadas con entrega. Copia privada: `.privado/evidencias/meta-campanas-historico-20261105.csv`. El nombre de descarga muestra 4 de noviembre; el contenido del CSV muestra 5 de noviembre. No se comparan estas cifras acumuladas como si fueran períodos iguales.

| Campaña | Gasto USD | Impresiones | Clics de enlace | Visitas de destino atribuidas |
| --- | ---: | ---: | ---: | ---: |
| Instagram «Cuenta regresiva…», agosto 2025 (archivada) | 29,90 | 16052 | 424 | Sin dato |
| Conozca el sitio, piloto octubre (archivada) | 0,10 | 68 | 2 | 2 |
| Video sitio web, reinicio 21 octubre | 6,04 | 2236 | 83 | 54 |
| Consultas desde la web, 23 octubre | 10,21 | 1447 | 56 | Sin dato |
| Nueva campaña de Ventas | 13,89 | 6499 | 1074 | Sin dato |
| Total | 60,14 | 26302 | 1639* | — |

*1639 es la suma de clics de enlace por campaña; no es visitantes únicos. El CSV muestra en algunas filas clics de enlace superiores a «clics (todos)»; conservar esa inconsistencia y no inferir sesiones a partir de ella. No hay resultados de compra atribuidos en la fila de Ventas ni resultado atribuido en Consultas. Un campo vacío no demuestra que no haya habido compras o conversaciones reales fuera de la atribución.

La campaña de tráfico del 21 de octubre tiene la mejor evidencia disponible de llegada (54 visitas atribuidas por USD 6,04), pero no prueba rentabilidad ni permite elegir una ganadora de ventas. Ventas presenta CTR de enlace 16,53% y CPC USD 0,0129 sin confirmación de compra: no escalar por clic barato. La tabla de ubicaciones muestra Audience Network y video con premio en la campaña de Ventas, pero la exportación detallada quedó procesando; no se atribuye a esas ubicaciones una cantidad ni causalidad sin el desglose.

Al consultar, las dos campañas recientes restantes están desactivadas y la de Ventas figura Completado, finalizada el 4 de noviembre. No se borran campañas ni resultados.

### Borrador guardado, NO publicado

- Campaña `120252337186760371`: SG | Lenovo 82XM | Ventas web | 05 nov 2026. Interruptor de campaña apagado, estado Borrador, cambios guardados.
- Conjunto `120252337186750371`: Costa Rica, objetivo de rendimiento maximizar conversiones, sitio web, Comprar; dataset existente `1837501974261618` (SG Solutions - Sitio web). Comprar aparece entre eventos activos, lo cual no demuestra una venta real reciente.
- Anuncio `120252337186770371`: publicación Instagram `18119971699982923`, foto del 5 de noviembre a las 10:52, misma descripción y precio ₡388.000. No es un Reel. Se eliminó del borrador la selección automática de un Reel distinto.
- Destino exacto del producto, botón Comprar. Parámetros separados: `utm_source={{site_source_name}}&utm_medium=paid_social&utm_campaign=sg_lenovo_82xm_20261105&utm_content=ig_dfxgowwso26`.
- Facebook e Instagram. Audience Network, WhatsApp y Threads excluidos; gasto limitado en excluidas desactivado. Elección de alcance controlado para este ensayo, no prueba de superioridad de estas redes.
- Redirección automática a otras páginas desactivada. Complemento de WhatsApp del navegador desactivado para conservar el enlace y medición propios de la tienda. Anuncios multianunciante desactivados. Ocho mejoras creativas automáticas desactivadas para conservar producto, texto y precio originales.
- Vistas previas de feeds Facebook/Instagram y Stories revisadas visualmente: precio, producto y oferta visibles. No se hizo clic publicitario ni se generaron conversiones sintéticas.
- Presupuesto PROPUESTO: USD 14 total, calendario de borrador 5–12 noviembre, 16:52 CST. Antes de publicar ajustar inicio y fin a siete días desde activación autorizada. No prometer aprendizaje completo ni ventas con este importe.

La ficha web coincide en precio, Ryzen 5, RAM 16GB, SSD 512GB, maletín y mouse. La licencia Microsoft 365 a precio especial está en la publicación pero no en la descripción web revisada; no se añade precio ni se presenta como incluida gratuitamente. No se comprobó inventario físico.

### Medición preparada localmente, pendiente de publicación

Se agrega `sg_lenovo_82xm_20261105` a la lista permitida de atribución y de fuentes de contactos; referencia WhatsApp `SG-TIENDA-LENOVO-0511`, con eliminación de referencias anteriores al cambiar campaña. Migración `20261105000300_contactos_campana_lenovo.sql` extiende la restricción de fuente, sin modificar históricos ni permisos.

El recorrido cuenta PageView de `/tienda` y sus fichas `/tienda/…`; ViewContent no duplica la vista. Se informa en ES/EN que la ampliación aplica desde esta actualización, sin reconstruir eventos pasados. Se mantienen consentimiento, exclusión administrativa, deduplicación y Purchase por pago confirmado. Esto no garantiza que Meta rellene su columna de visitas de destino.

Pruebas locales dirigidas preparadas; autorización solicitada conforme a AGENTS.md. No ejecutadas todavía. Tampoco se ha publicado código ni aplicado la migración. Antes de activar: autorizar nuevo gasto y publicación web/base; verificar código desplegado y respetar aprobación separada de pruebas/smoke.

Decisión posterior: evaluar contactos confirmados, cotizaciones y pagos junto con llegadas consentidas, no solo CTR. Mantener un conjunto y un anuncio evita fragmentar este presupuesto. Conservar dataset e históricos no traslada automáticamente el aprendizaje de un conjunto nuevo.

Fuente primaria consultada: [Meta: launching your first ad campaign](https://developers.meta.com/vr/resources/launch-ad-campaign/) distingue objetivo y optimización con medición web y recomienda adaptar dimensiones a ubicación. No se usa su contexto de apps VR para inferir rendimiento de esta laptop.
