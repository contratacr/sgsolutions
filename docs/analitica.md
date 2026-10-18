# Medición de SG Solutions

## Contadores propios

Desde la migración `20261017000200_estadisticas_agregadas.sql`, se acumulan cantidades por día de Costa Rica, tipo de evento, ruta pública normalizada, código de producto permitido, dispositivo general e idioma. No se crean filas por visita, UUID de visitante, sesiones, cuentas, IP, fecha/hora individual, búsqueda libre ni campañas UTM. Los contadores anteriores a 30 días se depuran cuando se reciben nuevos eventos. No se muestran personas únicas ni sesiones como si pudieran deducirse de estas cantidades.

La ruta antigua `/api/analitica` devuelve 410. Su función SQL ya no acepta escrituras anónimas o autenticadas. La función nueva solo permite escritura con el rol privado del servidor. Las tablas de contadores tienen RLS y no admiten lectura pública. Las cuentas y pedidos del panel son información operativa independiente, con permisos administrativos; no son seguimiento anónimo.

## Separación del transporte

La carga inicial verifica si la cuenta es administrativa; las cuentas administrativas activas e inactivas, las vistas privadas y los fallos al comprobar el rol quedan fuera de la medición. Las páginas aptas reciben un permiso público compartido, exactamente igual para todos los visitantes del proyecto. Es un HMAC de un literal fijo con separación de dominio: no contiene usuario, reloj, azar por visitante ni información del navegador. No es una credencial de autenticación, no permite consultar datos y no demuestra que una visita sea humana. Puede copiarse desde una página pública; no debe usarse para controles de acceso ni prevención de fraude.

El navegador envía `/api/estadisticas` con `credentials: omit`, `referrerPolicy: no-referrer` y `cache: no-store`. No transmite cookies, autorización de cuenta ni la URL de procedencia. El endpoint rechaza la colección con cookies o Authorization, sin consultar cuentas en Supabase. Valida origen, permiso compartido, tamaño y dimensiones cerradas. El límite por instancia no usa IP ni huellas digitales. El servidor solo envía el contador validado a Supabase con su credencial de servicio; nunca reenvía cabeceras del visitante. Los errores no registran cuerpo, URL, cuenta ni cabeceras.

No hay garantía de exactitud frente a clientes manipulados, bloqueadores, bots o fallos de red. Una persona que deliberadamente copie el permiso público puede fabricar eventos. La exclusión administrativa evita la navegación normal de esas cuentas, no pretende ser un mecanismo antifraude.

## Revisión de proveedores, 17 de octubre de 2026

Revisión autenticada del Worker `sgsolutions` y del proyecto Supabase de producción, sin usar `.env.local` como evidencia de producción:

- Cloudflare: Logs, Traces, Issues y Logpush desactivados; sin destinos de exportación disponibles. La configuración del repositorio conserva Logs/Traces desactivados y añade eliminación de query strings como protección si se habilitan posteriormente. Esto no desactiva el WAF ni otras protecciones de red.
- Supabase: Log Drains no está habilitado (el panel ofrece contratar un plan compatible). El explorador sí contiene logs operativos de Auth y REST, incluyendo filtros de cuenta en URLs. No se encontraron entradas de `registrar_conteo_anonimo` durante el intervalo de 24 horas examinado; no equivale a certificar que nunca existieron.
- La conexión SQL inspeccionada muestra `log_statement=ddl`, `log_min_duration_statement=-1`, `log_connections=off`, `pgaudit.log=none`, `pgaudit.log_parameter=off`, `log_parameter_max_length_on_error=0`. Son valores observados de esa conexión, no una certificación de todos los roles y servicios.

Cloudflare recibe la IP al atender HTTPS, incluso con `credentials: omit`. Supabase puede registrar metadatos de las solicitudes recibidas del servidor. No se puede garantizar anonimato absoluto frente a registros internos de proveedores, correlación temporal o información auxiliar. Quitar un campo del contador no borra registros históricos. No se han borrado logs ni desactivado controles de seguridad. No se deben cruzar los contadores con logs de acceso, cuentas o pedidos para identificar personas.

Fuentes oficiales: [Cloudflare Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/), [campos de logs de Supabase](https://supabase.com/docs/guides/observability/log-field-reference), [configuración de logs de Supabase](https://supabase.com/docs/guides/observability/configure-logging).

## Publicidad y comprobaciones

Meta permanece separado y solo se inicia tras aceptar publicidad en las preferencias del footer. Sin esa decisión no se carga el píxel. No se hace grabación de sesiones. El ID público configurado no es una clave privada.

Pruebas dirigidas: `npx playwright test --config playwright.estadisticas.config.ts` cubre escritorio y Safari móvil, ambos idiomas, exclusión administrativa, fallos de rol, ausencia de cookies/Referer, igualdad del permiso entre navegadores y transporte servidor–Supabase sin datos del visitante. `npm run verificar` y build antes de entregar cambios. La regresión completa solo se ejecuta manualmente según la preferencia del usuario; nunca contra producción.

### Exclusión del navegador administrativo y detalle del catálogo

La elegibilidad se vuelve a comprobar al navegar y al recuperar el foco o visibilidad, mediante `/api/medicion/permiso`, con respuesta privada sin caché. Esta comprobación usa la sesión para verificar el rol, pero no recibe eventos ni conserva identificadores. La colección de contadores sigue sin cookies ni consultas de cuenta por evento. Ante un fallo, se suspende la medición.

Al detectar administración se guarda únicamente `sg-excluir-medicion=1` en el navegador: una preferencia de exclusión, sin ID. Se comunica a las otras pestañas, permanece después de cerrar sesión y bloquea también Meta. No permite reconocer a un administrador anónimo en un navegador nuevo o con almacenamiento borrado. No se intenta reconstruir ni borrar selectivamente visitas históricas ya agregadas.

El panel agrupa ID y slug de un producto. Las categorías y subcategorías suman aperturas de fichas y vistas rápidas según la categoría principal del catálogo actual; no miden clics de filtros ni personas únicas. Los productos retirados se conservan en el ranking como no clasificables. Las apariciones en búsquedas se muestran por separado y no se llaman visitas. Cambiar la clasificación actual puede cambiar el reparto histórico por categoría. No se añade información personal ni una nueva dimensión a la base de contadores.

Referencias: [persistencia de layouts de Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/layout), [verificación de usuario de Supabase](https://supabase.com/docs/reference/javascript/auth-getuser).
