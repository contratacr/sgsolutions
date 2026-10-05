# Catálogo manual y venta asistida

## Recorrido del cliente

1. Explora productos seleccionados con precios de referencia e IVA incluido.
2. Pulsa «Recibir asesoría». Se guarda una solicitud previa al pedido y se abre WhatsApp con productos, cantidades, códigos y referencia SG. El cliente envía el mensaje; la app no lo envía automáticamente.
3. En Panel → Pedidos → Solicitudes de asesoría, el equipo encuentra la referencia, ajusta productos/cantidades/precios y confirma que realizó la asesoría y revisó disponibilidad.
4. «Generar enlace de compra» genera un enlace privado `/compra/…` que vence en 24 horas. Puede copiarse y compartirse con el cliente. Prepararlo nuevamente invalida el enlace anterior. También se puede preparar una compra sin referencia para consultas generales. El acceso nuevo tiene 128 bits aleatorios, representados en 22 caracteres base64url, sin UUID ni parámetros. No requiere migración; los accesos anteriores de 256 bits / 43 caracteres y los enlaces con parámetros siguen validándose. No se permite indexación, caché compartida ni envío del enlace como referrer.
5. El cliente abre ese enlace en cualquier dispositivo, completa datos y entrega y genera su pedido. El carrito no habilita checkout. Las APIs de pedido manual y tarjeta validan la autorización en el servidor, las cantidades exactas y un único uso. Los precios aprobados quedan fijos.

No se cobra ni reserva inventario al solicitar asesoría. El pedido manual aprobado nace pendiente de pago; después muestra datos bancarios y permite adjuntar el comprobante. El equipo verifica el ingreso antes de marcarlo pagado. Se mantiene Correos de Costa Rica a ₡3500. Los pagos reales siguen deshabilitados; Tilopay solo conserva el flujo de prueba existente.

## Base de datos y publicación

Aplicar la migración `20261004000100_asesorias.sql` antes de desplegar esta versión. La tabla tiene RLS y acceso exclusivo de `service_role`; ninguna cuenta pública puede aprobar solicitudes. Se usan `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` existentes. El modo admin local guarda solicitudes en `.privado/admin-local/asesorias.json`, nunca en el proyecto remoto. `PEDIDOS_ORIGEN_PUBLICO` debe ser el origen HTTPS que se compartirá con clientes.

La transición de aprobación a procesamiento es condicional para impedir dos pedidos concurrentes. Un fallo de inserción libera la aprobación; un resultado incierto del proveedor de tarjetas deja el enlace usado para evitar cobros duplicados. Si queda procesando por interrupción, el equipo debe revisar el pedido antes de generar otro enlace.

## Administración

En Productos se muestran inicialmente los publicados. Filtre por categoría, busque o cambie a Borradores. Edite datos básicos, precio de referencia en colones, disponibilidad, imágenes, especificaciones y publicación. Guarde los cambios. Los textos siguen disponibles en español e inglés.

La primera adaptación elige hasta cinco productos por categoría entre los publicados: prioriza los no agotados, con precio y destacados. Es una selección provisional para que Luis la revise. Los demás quedan en borrador, sin borrar sus fichas ni imágenes. Los precios existentes se copian como precios manuales; no se recalculan al cambiar una fórmula.

Tras guardar, el catálogo queda marcado como manual. Las publicaciones y precios posteriores se respetan, sin una tarea automática que vuelva a escoger los cinco. Se recomienda mantener aproximadamente cinco por categoría, pero el administrador puede publicar más.

## Código y datos

Retirados: importador Excel, sincronizador IWS, extensión Edge, scripts de extracción/enriquecimiento y pruebas exclusivas del flujo eliminado. Se conserva compatibilidad de lectura del JSON histórico y las migraciones SQL ya existentes. Leer el catálogo antiguo no escribe en producción: la adaptación se persiste al guardar desde el administrador.

El push no despliega automáticamente: el despliegue y la migración de producción requieren el procedimiento de publicación del repositorio.

## Verificación

`SG_TEST_ALTAS=1 npx playwright test tests/asesoria-aprobacion.spec.ts --workers=1` comprueba aprobación por el panel, cambios de precio/cantidad y enlaces renovados/vencidos/usados en ambos idiomas y tamaños de pantalla.

La prueba de APIs con almacenamiento REST simulado, sin correos ni cobros reales, se ejecuta con `NEXT_PUBLIC_SUPABASE_URL='' NEXT_PUBLIC_SUPABASE_ANON_KEY='' npm run build` y después `node scripts/probar-pedido-aprobado.mjs`. Usa únicamente los puertos locales 3108 y 54329. Comprueba precio aprobado, envío, dos envíos concurrentes, reutilización y recuperación tras un fallo de inserción. No sustituye una prueba de la migración en Supabase.

## Entrada por necesidad y consultas de contacto

Soluciones ofrece cuatro accesos directos a WhatsApp con el motivo de consulta: red/Wi‑Fi, negocio, seguridad y computadora. Una consulta general no exige productos ni solicita datos de facturación. El carrito se conserva para reunir productos antes de conversar.

«Prefiero que me contacten» permite dejar nombre, WhatsApp con código de país y necesidad, con autorización para atender la consulta. Se guarda en la misma bandeja privada de asesorías; no envía WhatsApp ni promete un tiempo de respuesta. El equipo debe revisar la bandeja y contactar al cliente. No hay horario confirmado para publicarlo.

Las pendientes aparecen primero, de más antigua a más reciente, con fecha y acceso a WhatsApp cuando el cliente dejó su número. Para una compra sencilla el equipo puede preparar el enlace en la misma conversación; para proyectos primero define la solución. No se añadieron dirección, facturación ni método de pago al formulario de consulta.

Antes de publicar, aplicar también `20261004000200_asesorias_contacto.sql`, después de la migración inicial de asesorías. Los datos de contacto permanecen protegidos por las políticas privadas de la tabla. El push por sí solo no aplica migraciones ni despliega producción.


## Revisión del panel, 4 de octubre de 2026

La referencia de interacción es el pedido borrador de Shopify: el asesor construye la compra y comparte un enlace, antes de que el cliente ingrese sus datos de entrega/pago. La app conserva la asesoría como entrada principal y la gestión manual del catálogo.

Referencias: [pedidos borradores](https://help.shopify.com/en/manual/fulfillment/managing-orders/create-orders/create-draft), [búsqueda y filtros](https://help.shopify.com/en/manual/products/searching-filtering), [componentes y accesibilidad](https://design-system.service.gov.uk/components/).

Inventario completo de funciones visibles y criterio aplicado:

1. **Acceso**: correo, contraseña, validación, estados de carga y errores traducidos; sin cambios de credenciales ni permisos.
2. **Navegación**: Administración, Productos, Contenido, Pedidos, Estadísticas, cerrar sesión y ver sitio; iconos identificables, página activa y navegación en la misma pestaña.
3. **Inicio**: cuatro módulos y una guía de trabajo de tres pasos. Aviso de prueba local separado del contenido operativo.
4. **Listado de productos**: búsqueda por nombre/marca/código, categoría, publicados/borradores/todos, conteos y páginas de 20 productos; los nombres pueden ocupar más de una línea.
5. **Producto — información**: nombre y descripción en español/inglés, categoría y marca, con índice de secciones.
6. **Producto — precio**: referencia en colones con IVA, precio pendiente, disponibilidad y código de fabricante. El precio acordado se establece al preparar la compra.
7. **Producto — imágenes**: subir, reemplazar, portada, ordenar, quitar, deshacer, URL, vista previa, errores y límite; ficha técnica HTTPS. Se conserva el gestor existente con controles coherentes.
8. **Producto — especificaciones**: nombres/valores bilingües, agregar/quitar; sección secundaria desplegable.
9. **Producto — publicación**: público o privado, destacado y eliminación secundaria con confirmación. Los productos privados pueden usarse en la compra asesorada.
10. **Categorías**: nombre en ambos idiomas, agregar/quitar; no se elimina una categoría utilizada. Campos y desplegables con estilos uniformes.
11. **Presentación de Soluciones**: título, descripción y aviso bilingües; nombres adaptados al modelo de soluciones, sin referencias a una tienda convencional.
12. **Guardado**: guardar, descartar en catálogo, cambios pendientes, validación con foco, conflictos de revisión y errores. Sin pérdida de la edición por un fallo de servidor.
13. **Casos de éxito**: búsqueda por cliente/título, publicación, categoría, historia, solución y fotografías; estado visible antes de abrir la edición.
14. **Textos del sitio**: filtro por sección, búsqueda sobre la versión editada, bloques de 30 y mostrar más. Resumen en el idioma del panel; claves técnicas dentro del registro. Se excluyen textos internos de administración y analítica.
15. **Datos bancarios**: titular, número SINPE, banco e IBAN, agrupados. Guardarlos no configura Brevo ni activa cobros de tarjeta.
16. **Asesorías**: Por atender, Sin asesorar, Historial y Todos; búsqueda por referencia/cliente/teléfono/producto y páginas de 10. Se abre una solicitud para trabajarla en lugar de desplegar todos los formularios juntos.
17. **Contacto solicitado**: nombre, necesidad y botón de WhatsApp; la app prepara el mensaje pero no lo envía.
18. **Preparación de compra**: agregar por búsqueda de nombre/marca/código, incluyendo productos privados; quitar/cambiar recomendaciones, cantidad 1–99, precio unitario positivo, importe por línea y total. Vacíos y errores traducidos.
19. **Autorización y enlace**: confirmación del acuerdo/disponibilidad, botón con estado de carga, enlace copiable de 24 horas, renovación que invalida el anterior, cancelación secundaria. El enlace usa el origen configurado o el sitio actual; nunca se presenta como correo enviado.
20. **SINPE/transferencias**: sección independiente, búsqueda, filtros, paginación, cliente, entrega, envío, total, comprobante temporal privado, enlace de seguimiento y estados. Confirmar el pago exige verificarlo en el banco.
21. **Correos del pedido**: destinatario es el correo ingresado en checkout; remitente viene de BREVO_REMITENTE y se usa BREVO_API_KEY del servidor. Sin envío automático configurado o ante un fallo, el panel indica compartir el enlace. Generar una asesoría no envía correo.
22. **Tarjeta**: sección independiente con búsqueda/filtros/paginación, cliente, productos, estado, entorno y total. No se activan cobros reales desde esta revisión.
23. **Estadísticas**: sesiones, páginas y WhatsApp; productos, búsquedas, carrito, planes, correo, teléfono, mapas, redes, galerías, revisión, scroll y campañas. Conteos por grupo y explicación secundaria del alcance. Clics no equivalen a ventas.
24. **Transversal**: desplegables con flecha separada del borde, casillas de 18px, foco visible, controles de al menos 44px, ajuste móvil, español/inglés y persistencia del idioma; logo oficial en cabecera/footer.

Límites actuales: asesorías recupera hasta 100 pendientes y 50 de otros estados; pagos muestran los 50 más recientes por tipo. La búsqueda y paginación operan sobre esos registros recuperados, no sobre todo el histórico. No se implementó un CRM, envío automático de WhatsApp, sincronización IWS ni nuevas configuraciones de cobro/correo. Las pruebas de modificación se ejecutan sobre archivos locales con respaldo/restauración, sin enviar mensajes, correos ni cobros reales.

Validación de esta revisión: 20 escenarios de navegador en español/inglés y escritorio/móvil, correspondientes a altas/edición, estadísticas, recorrido completo, aprobación y acceso protegido con build de producción. La aprobación incluye reemplazar un equipo por otro privado, precios/cantidades, confirmación obligatoria, renovación/vencimiento/uso del enlace, paginación de historial y búsquedas con/sin resultados. `npm run verificar` y `npm run build` completados.

El recorrido en desarrollo excluye únicamente el error conocido del profiler de React con timestamp negativo al abortar las redirecciones de autenticación (`vercel/next.js#86060`). La prueba `panel-produccion-smoke.spec.ts` comprueba esos accesos en el build de producción sin excluir errores del navegador. No se publicaron estos cambios.


## Contacto y carrito, 5 de octubre de 2026

El teléfono parte de +506 editable. Ocho dígitos locales se normalizan con 506; se permiten formatos internacionales con + o 00, espacios, guiones y paréntesis. Se valida el formato, no la existencia de una cuenta de WhatsApp. Los números de Costa Rica requieren ocho dígitos tras el prefijo. Nombre, teléfono y consentimiento tienen errores propios y foco en el primer campo inválido; un fallo del servidor conserva la información. La necesidad es opcional. Las consultas llegan a Panel → Pedidos → Solicitudes de asesoría.

Las nuevas consultas reciben SG-0001, SG-0002, etc. Aplicar `20261005000100_referencias_asesoria.sql` antes de publicar para habilitar el consecutivo en Supabase. La secuencia pertenece a la tabla y está restringida a service_role. No cambia las referencias históricas ni los tokens de compra; conocer un consecutivo no concede acceso. Localmente se asigna dentro de la escritura serializada.

Agregar productos muestra un aviso con el nombre y «Ver carrito», sin mover el foco ni interrumpir la navegación. Solo confirma si la cantidad aumentó; al alcanzar un límite informa el resultado. Solicitar asesoría conserva la pestaña original y abre una copia de Soluciones mientras prepara WhatsApp, evitando about:blank al regresar de la app móvil. Las marcas usan dos bandas idénticas de ancho suficiente incluso con una sola marca; las copias se ocultan a tecnologías de asistencia. Se mantienen movimiento reducido y pausa al interactuar. Las categorías alinean nombre y cantidad verticalmente. La portada distingue «Soluciones» de «Para empresas», con «Ver planes».

Referencias de diseño: [teléfonos internacionales de GOV.UK](https://design-system.service.gov.uk/patterns/phone-numbers/) y [carrito de Shopify Dawn](https://github.com/Shopify/dawn/blob/main/snippets/cart-drawer.liquid).

Pruebas: contacto vacío, números nacionales/internacionales y formato inválido, errores de servidor/reintento, necesidad opcional, referencias simultáneas, regreso desde WhatsApp, confirmación y apertura del carrito, cinta con una sola marca, continuidad con imágenes lentas, regreso de fichas y aprobación protegida. WhatsApp se simula en pruebas; no se envían mensajes ni se cobran compras. Los registros locales utilizados se respaldan y restauran.


## Enlace de compra y posición del resultado

Los nuevos enlaces usan 16 bytes aleatorios criptográficos (128 bits), representados en 22 caracteres base64url. Se mantienen los enlaces anteriores de 43 caracteres y los parámetros UUID/token anteriores. La tabla token no tiene restricción de longitud y no requiere migración adicional. Las APIs admiten únicamente los dos tamaños previstos, la representación base64url canónica, aprobación vigente y cantidades autorizadas. Se conserva vencimiento de 24 horas, uso único, renovación y no-referrer/no-store.

La tarjeta presenta referencia, estado listo, ruta corta y Copiar enlace; la dirección absoluta sigue disponible bajo Ver enlace completo y es lo que se copia. Si falla el portapapeles, abre el detalle y selecciona el campo para copiar manualmente. El dominio workers.dev continúa hasta configurar un dominio propio autorizado.

Al generar, el resultado abre la solicitud, selecciona la página de lista que la contiene, mueve el foco sin desplazamiento previo y centra el enlace. Se respeta movimiento reducido. El fragmento de la redirección también apunta al resultado para navegación sin JavaScript. Pruebas en ambos idiomas y tamaños: copiar URL, 22 caracteres, compatibilidad histórica, aprobación/renovación/vencimiento/uso y resultado en segunda página con quince consultas pendientes.

Criterio de aleatoriedad: [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), mínimo de 128 bits para identificadores criptográficos propios. Estas claves autorizan una compra concreta; la referencia consecutiva sigue sin conceder acceso.

### Contacto e historial de pedidos

- Todas las secciones muestran los datos de contacto guardados y WhatsApp si existe un teléfono válido. Las asesorías con pedido incorporan los datos del cliente de los pedidos cargados en el panel. Se indica explícitamente si no se dejó teléfono; no se inventa ni se usa el número del negocio como destino.
- Solo una consulta cancelada sin `pedido_id` puede eliminarse del panel. Requiere confirmación y autorización administrativa en servidor, y comprueba el estado al escribir. Los pedidos manuales y con tarjeta conservan su historial.
- La eliminación es lógica (`eliminado_en`): se oculta en todas las listas y se conserva la referencia interna para evitar reutilizar números. No es una eliminación definitiva de datos personales.
- Aplicar `20261005000200_eliminar_consultas_canceladas.sql` antes de publicar este bloque. Aplicada y verificada en SG Solutions Producción el 5 de octubre de 2026, junto con la migración de referencias numéricas.
- Pruebas locales en ES/EN, escritorio/móvil: contacto, falta de teléfono, enlace externo accesible, confirmación obligatoria, rechazo de ID manipulado, persistencia de eliminación y referencias consecutivas sin reutilización. No se enviaron mensajes ni se efectuaron cobros.
