# Correos de cuentas de SG Solutions

Las 13 plantillas usan el logo gráfico oficial, azul #2f4e73, texto #17354b, fondo blanco y acento #f05a28. El contenido selecciona inglés cuando `Data.idioma` es `en`; español es el valor predeterminado. Los asuntos son bilingües para que no dependan del soporte de metadatos en asuntos.

Regenerar: `node --import tsx scripts/plantillas-cuenta.mjs`. Este script es la fuente de los HTML y los manifiestos; no editar cada copia manualmente.

Las seis plantillas de autenticación están enlazadas en `supabase/config.toml`. Los archivos de notificaciones no activan correos ni cambian la seguridad de Supabase. Para el proyecto alojado se deben guardar el HTML y el asunto correspondiente en Authentication → Email → Templates; conservar los interruptores de avisos existentes.

Confirmación usa `{{ .Token }}`: código de 6 dígitos validado en la pantalla de registro con Supabase. Configurar `mailer_otp_length=6`, `mailer_otp_exp=600`, `smtp_max_frequency=60` y `password_min_length=8` en el proyecto alojado al publicar este flujo. Recuperación conserva el callback de SG Solutions con `TokenHash` para la verificación del lado del servidor. Recuperación conserva el parámetro `flujo=recuperar` enviado por la app. Invitaciones, cambios de correo y enlaces mágicos conservan `ConfirmationURL`. Reautenticación muestra `Token` y no un enlace.

El logo oficial carga desde `https://sgsolutionscr.com/imagenes/logo-principal.png`. Los clientes de correo pueden bloquear las imágenes externas; el contenido y las acciones siguen siendo legibles. Todas las plantillas comparten el marco de `src/lib/email/plantilla.ts`: fondo continuo, tablas compatibles con Outlook y estilos para modo oscuro.

Pruebas visuales con datos ficticios: `npx playwright test tests/plantillas-correo.spec.ts --config=playwright.codigo.config.ts`. No envían correos. Verifican las 13 plantillas en ambos idiomas, escritorio/móvil, carga del logo, ancho y enlaces de confirmación/recuperación con y sin RedirectTo. No reemplazan una recepción real en Gmail/Outlook ni la validación del editor de Supabase.

Referencia: https://supabase.com/docs/guides/auth/auth-email-templates
