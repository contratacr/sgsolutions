# Pruebas de cuenta · 11 de octubre de 2026

- 8 pruebas de Playwright aprobadas: escritorio/móvil y español/inglés. Formulario de acceso y registro, validación de contraseñas distintas, conservación de datos tras un error, mostrar contraseña, preferencia de idioma tras recargar, ausencia de desbordamiento a 320 px, recuperación, reenvío de confirmación y rechazo de recuperación sin sesión/enlace inválido.
- Las pruebas de formularios se ejecutaron en un servidor aislado en el puerto 3108, con Supabase deshabilitado, para no crear clientes ni enviar correos de prueba a direcciones ajenas.
- Verificación directa contra Supabase remoto: Auth accesible, registros habilitados, confirmación de correo obligatoria, inicio con credenciales inválidas rechazado y RPC de historial bloqueado para acceso anónimo (401).
- La prueba de aislamiento de base de datos del mismo día aprobó pedidos propios, separación de usuarios, exclusión de compras de prueba y ausencia de permisos directos de tablas. Todos sus datos temporales se revirtieron.
- Revisión visual del registro en escritorio y móvil, español e inglés. Se corrigió la superposición del WhatsApp flotante sobre el control de contraseña en móvil; los enlaces de contacto del footer siguen disponibles.
- `npm run verificar` aprobado: TypeScript, ESLint, 1384 claves bilingües y revisión heurística de secretos.

Pendiente: con una dirección de correo de prueba autorizada, registrar una cuenta real, recibir/abrir la confirmación, iniciar sesión, cerrar sesión y recibir/abrir el enlace de recuperación. No afirmar que la entrega SMTP o estos flujos completos están verificados hasta completar esa prueba.

Cambios locales; sin publicación en producción.
