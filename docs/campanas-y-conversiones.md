# Campañas y conversiones de SG Solutions

Implementación local validada mediante pruebas aisladas autorizadas, pendiente de migración y publicación. No interpretar la presencia de código como recepción de Meta ni como atribución a anuncios.

## Dos alcances

- Contadores propios: totales diarios de páginas, productos, clics, búsquedas sin texto, búsquedas sin resultados, cambios del tipo de filtro y formularios. No incluyen identificadores de personas, cuentas, sesiones, IP, mensajes ni historial individual. La cantidad de cierres de formularios es aproximada: se observa que el formulario se retire sin envío mientras la página sigue activa; no reconstruye abandonos fuera de línea.
- Atribución publicitaria: únicamente tras una elección actual de publicidad. `sg-publicidad` es HttpOnly, firmada, SameSite=Lax y Secure en producción. Caduca a los 30 días del primer permiso, sin extenderse en cada visita. Contiene un ID técnico, fbp, fbc cuando existe clic de Meta, primer origen y reciente. Es seudónima, no anónima. No se vincula a la cuenta. Un navegador compartido puede compartir esta atribución.
- La preferencia antigua del Pixel no se eleva automáticamente al permiso nuevo `2026-10-20-campanas-v1`. Las negativas siguen siendo negativas. La elección se mantiene en las preferencias existentes, sin ventanas automáticas.
- Los códigos `utm_campaign` se aceptan solo si están en `SG_CAMPANAS_PERMITIDAS`. Fuente/medio usan listas cerradas. Facebook/Instagram de referencia no significan anuncios pagados. UTM desconocida no se publica como campaña pagada verificada; los valores declarados no demuestran por sí mismos un clic pagado real.
- La atribución permite contar conversiones por campaña, no calcular ROAS ni costo de adquisición sin importar gasto real de anuncios. No se atribuyen conversiones históricas sin contexto permitido.

## Hechos y eventos

| Hecho | Interno | Meta con permiso y configuración |
| --- | --- | --- |
| Vista pública | Página agregada; origen con permiso | PageView |
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
