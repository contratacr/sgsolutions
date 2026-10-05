# Catálogo manual y venta asistida

## Recorrido del cliente

1. Explora productos seleccionados con precios de referencia e IVA incluido.
2. Pulsa «Recibir asesoría». Se guarda una solicitud previa al pedido y se abre WhatsApp con productos, cantidades, códigos y referencia SG. El cliente envía el mensaje; la app no lo envía automáticamente.
3. En Panel → Pedidos → Solicitudes de asesoría, el equipo encuentra la referencia, ajusta productos/cantidades/precios y confirma que realizó la asesoría y revisó disponibilidad.
4. «Preparar pedido» genera un enlace privado que vence en 24 horas. Puede copiarse y compartirse con el cliente. Prepararlo nuevamente invalida el enlace anterior. También se puede preparar una compra sin referencia para consultas generales.
5. El cliente abre ese enlace en cualquier dispositivo, completa datos y entrega y genera su pedido. El carrito no habilita checkout. Las APIs de pedido manual y tarjeta validan la autorización en el servidor, las cantidades exactas y un único uso. Los precios aprobados quedan fijos.

No se cobra ni reserva inventario al solicitar asesoría. El pedido manual aprobado nace pendiente de pago; después muestra datos bancarios y permite adjuntar el comprobante. El equipo verifica el ingreso antes de marcarlo pagado. Se mantiene Correos de Costa Rica a ₡3500. Los pagos reales siguen deshabilitados; Tilopay solo conserva el flujo de prueba existente.

## Base de datos y publicación

Aplicar la migración `20261004000100_asesorias.sql` antes de desplegar esta versión. La tabla tiene RLS y acceso exclusivo de `service_role`; ninguna cuenta pública puede aprobar solicitudes. Se usan `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` existentes. El modo admin local guarda solicitudes en `.privado/admin-local/asesorias.json`, nunca en el proyecto remoto. `PEDIDOS_ORIGEN_PUBLICO` debe ser el origen HTTPS que se compartirá con clientes.

La transición de aprobación a procesamiento es condicional para impedir dos pedidos concurrentes. Un fallo de inserción libera la aprobación; un resultado incierto del proveedor de tarjetas deja el enlace usado para evitar cobros duplicados. Si queda procesando por interrupción, el equipo debe revisar el pedido antes de generar otro enlace.

## Administración

En Productos se muestran inicialmente los publicados. Filtre por categoría, busque o cambie a Borradores. Edite datos básicos, precio final en colones, disponibilidad, imágenes, especificaciones y publicación. Guarde los cambios. Los textos siguen disponibles en español e inglés.

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
