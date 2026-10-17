# Cuenta de clientes

La cuenta es opcional: la compra como invitado sigue disponible. En `/cuenta` hay dos opciones: iniciar sesión con correo y contraseña, o registrarse con nombre completo, correo, contraseña y confirmación de contraseña. El registro exige verificar el correo mediante un enlace de un solo uso. Supabase Auth administra las contraseñas; la aplicación no las guarda en perfiles, pedidos, logs ni almacenamiento del navegador. La validación requiere entre 10 y 128 caracteres y coincidencia de la confirmación. También hay recuperación de contraseña y reenvío de confirmación.

El historial reúne los pedidos manuales y de tarjeta cuyo `cliente.correo` coincide con el correo **confirmado** de la sesión. Al consultar, la función `mis_pedidos()` vincula los pedidos aún no asociados al ID de la cuenta verificada y conserva esa asociación aunque cambie el correo posteriormente. Devuelve solo número, fecha, estado, total y artículos (máximo 100 recientes). No concede acceso directo a las tablas de pedidos, comprobantes, datos fiscales ni transacciones. Los pedidos de tarjeta del entorno de pruebas quedan excluidos. Los pedidos anteriores aparecen después de verificar el mismo correo usado al comprar; un pedido con otro correo requiere revisión del equipo.

## Para habilitarlo en el entorno de destino

1. Aplicar `supabase/migrations/20261011000100_cuenta_clientes.sql` al proyecto Supabase correspondiente. Revisar antes los índices y el permiso de ejecución de `mis_pedidos`.
2. En Supabase Auth, habilitar inicio por correo y configurar el SMTP transaccional de producción. Confirmar que los correos de acceso salen con el dominio de SG Solutions. El envío integrado por defecto de Supabase no sirve para clientes generales en producción.
3. Añadir `https://sgsolutionscr.com/cuenta/confirmar` a las Redirect URLs de Auth y establecer la Site URL de producción. `PEDIDOS_ORIGEN_PUBLICO` debe tener ese mismo origen. Para pruebas locales, permitir `http://127.0.0.1:3107/cuenta/confirmar`.
4. Probar con un correo de cliente de prueba: primer acceso, acceso posterior, enlace vencido, sesión persistente, cierre de sesión y pedidos propios. Probar con un segundo correo y comprobar que no ve los pedidos del primero. Revisar en escritorio/móvil y español/inglés.

El registro y la recuperación responden sin confirmar si un correo ya tiene cuenta. Supabase limita las solicitudes repetidas de correos. Los errores conservan los datos del formulario y la contraseña nunca se persiste. La recuperación requiere una sesión verificada por el enlace y una autorización temporal de 10 minutos guardada en una cookie HttpOnly vinculada al usuario. La ruta `/cuenta` no debe indexarse ni almacenarse en caché compartida.

## Después del primer lanzamiento

Solo cuando el flujo básico esté validado, considerar datos de entrega/facturación guardados y autocompletado del checkout. No guardar métodos de pago ni crear pedidos automáticamente desde el historial. La factura electrónica sigue enviándose desde GTI; la cuenta puede mostrar su estado o un enlace seguro si se integra más adelante.

## Google y Facebook

El formulario incluye el inicio social con Supabase y PKCE. Consulta los proveedores habilitados en `/auth/v1/settings` y muestra solo los que estén activos; si la consulta falla, el acceso por correo sigue disponible. Las acciones validan nuevamente el proveedor antes de redirigir y usan `/cuenta/confirmar` para completar la sesión. Facebook solicita el permiso `email`. Ningún secreto OAuth se guarda en el frontend o el repositorio.

Para activarlos, crear o usar aplicaciones de SG Solutions en Google Auth Platform y Meta Developers. Sus callbacks externos son `https://xkfiawkixcyzpfdwccxz.supabase.co/auth/v1/callback`. Google requiere Client ID y Client Secret; Facebook requiere App ID y App Secret, permisos `public_profile` y `email`, y modo público para clientes reales. Guardar esas credenciales exclusivamente en los proveedores de Supabase. Mantener las URLs de retorno de clientes ya autorizadas. En la revisión del 11 de octubre ambos proveedores seguían deshabilitados; la sesión de Google disponible correspondía a ContrataCR y Meta pedía iniciar sesión. Falta acceso a las cuentas correctas y la configuración externa, por lo que no se debe presentar el inicio social como activado.

Se probaron por separado el flujo local sin proveedores y el inicio de OAuth contra un servidor simulado: botones en español/inglés y móvil/escritorio, proveedor correcto, callback, desafío PKCE y alcance `email` en Facebook. La simulación verifica la integración de código, no sustituye el acceso real con cada proveedor.

Para pruebas de autenticación en localhost, `CUENTAS_SUPABASE_URL` y `CUENTAS_SUPABASE_ANON_KEY` permiten conectar únicamente la cuenta de clientes al proyecto remoto sin habilitar pagos ni administración remota.

El 11 de octubre de 2026 se configuró el proyecto de producción con SMTP de Brevo (remitente `asesor@sgsolutionscr.com`), registro con confirmación obligatoria, contraseña mínima de 10 caracteres, cambio seguro de contraseña y callbacks exactos para localhost y el dominio real. Se conservaron los callbacks de activación del administrador. Las plantillas de confirmación y recuperación usan el idioma del perfil y enlaces con token de un solo uso. La clave SMTP solo se guarda en Supabase, no en el repositorio.

Se aplicó primero la migración faltante `20260930000100_pedidos_tilopay.sql` y luego la migración de clientes. Una prueba en transacción con dos usuarios temporales verificó pedidos propios, aislamiento entre usuarios, exclusión de tarjetas en pruebas y ausencia de acceso anónimo o directo a tablas. Se revirtieron todos los datos de prueba. La configuración y esas pruebas no equivalen a verificar la entrega en una bandeja real: falta completar el primer registro desde la interfaz y recibir el correo. Los cambios de interfaz permanecen locales hasta autorizar su publicación.

### Favoritos: tarjetas y equipos empresariales

La tienda y los favoritos comparten `TarjetaProducto`. La cuadrícula se adapta al ancho de su contenedor: dos columnas, tres desde 700 px y cuatro desde 980 px. Conserva las acciones de compra, consulta y vista previa.

La ampliación a identificadores `empresa-intcomex-*` requiere la migración `20261016000100_favoritos_empresariales.sql` antes de publicar el cambio de API. Mantiene las políticas de propiedad y cuenta habilitada. Se probó con PostgreSQL aislado y se aplicó en producción desde SQL Editor, con autorización explícita del usuario el 16 de octubre de 2026. Se verificaron la nueva restricción, RLS activo, las tres políticas originales y la conservación del favorito existente.
