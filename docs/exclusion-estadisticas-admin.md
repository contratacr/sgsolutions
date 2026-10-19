# Exclusión del tráfico administrativo

La medición consulta el rol verificado del servidor, no metadatos editables ni el nivel MFA. Incluye administradores antes de completar el segundo factor, cuentas inactivas y errores temporales de lectura del rol (sin medir cuando no se puede verificar).

La marca de administración se aplica en todas las rutas, incluida `/cuenta`, y se conserva localmente después de salir. Antes de eliminar la sesión, ambos cierres de sesión guardan además una cookie funcional `sg-excluir-medicion=1`, HttpOnly, SameSite=Lax y Secure en producción, con duración de un año. El valor es idéntico para todos: no contiene cuenta, sesión, IP ni identificador del dispositivo. Así también se excluye el navegador si se pierde o bloquea localStorage. Las pestañas abiertas reciben la exclusión mediante el evento de almacenamiento y vuelven a verificar al recuperar el foco.

Los eventos siguen enviándose sin cookies, credenciales ni referencia. No se consulta una cuenta por evento ni se añaden identificadores a los contadores agregados. La cookie de exclusión nunca concede permisos de cuenta o del panel.

Al borrar **todos** los datos del sitio o usar otro navegador/incógnito sin iniciar sesión, la visita es anónima y no puede reconocerse como administrativa. Los contadores históricos, al ser agregados sin identidad, no permiten identificar y retirar visitas anteriores de una persona.

Validación dirigida: `npx playwright test -c playwright.exclusion-admin.config.ts`. Usa únicamente Next local y un servicio ficticio que simula Auth y RPC en loopback; no afirma validar el proveedor real ni consulta producción. Cubre PC y Safari móvil, ambos idiomas en el recorrido principal, cierre real y cierre directo del servidor, almacenamiento local vacío, pestaña pública previa al acceso, fallo de consulta del rol y clientes que sí deben contar. Ejecutar solo con autorización explícita del usuario.
