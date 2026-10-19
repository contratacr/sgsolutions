# Doble factor obligatorio del panel

Se exige a todos los administradores activos, incluidos los existentes y los que entran con Google. Las cuentas de clientes conservan su acceso normal. La preferencia ES/EN permanece disponible en las pantallas de configuración y verificación.

## Acceso y defensa

- `/admin/doble-factor`, fuera de `/panel`, permite configurar TOTP mediante QR o clave manual. Un administrador con un factor ya verificado debe ingresar el código; la acción de configuración no permite sustituirlo con solo la contraseña.
- Supabase Auth verifica los códigos. El QR y la clave se muestran exclusivamente al usuario durante el alta, sin guardarlos en almacenamiento del navegador, registros ni analítica. No hay cliente Supabase en el navegador; los tokens siguen en cookies HTTP-only.
- `es_administrador_identificado()` comprueba únicamente identidad/rol activo, cuenta no bloqueada/eliminada. Solo habilita la entrada a configuración e invitación, y el enlace desde Mi cuenta. No autoriza datos administrativos.
- `es_administrador_activo()` exige además JWT `aal2` y una sesión vigente en `auth.sessions` vinculada al mismo factor TOTP verificado que produjo el token. Todos los RPC, políticas RLS y permisos de subida de imágenes que ya usan esta función quedan protegidos. Revocar la sesión o sustituir su factor bloquea incluso un JWT AAL2 anterior, aunque se configure otro autenticador.
- Cada página administrativa, Server Action y API administrativa verifica permisos antes de acceder a argumentos, datos o clientes con privilegios. El layout no constituye la única protección. `scripts/verificar-mfa.mjs` impide omitir una entrada en futuros cambios.
- Los procesos automáticos con `service_role` mantienen su funcionamiento; no representan sesiones de administradores. La excepción local requiere desarrollo, host de bucle local y configuración de servidor; nunca se activa en producción mediante cookies o cabeceras.
- La comprobación se comparte únicamente dentro de cada render con `React.cache`, sin caché global de sesiones ni permisos.
- Usuarios muestra si cada administrador tiene el doble factor configurado. El RPC de estado no entrega identificadores de factores, códigos ni claves.

## Recuperación supervisada

No existe un botón público para quitar MFA ni un enlace por correo que lo omita. Una recuperación de contraseña no borra los factores ni concede AAL2.

Si una persona pierde el autenticador, el responsable del proyecto debe verificar su identidad por un canal independiente. Después, desde la administración de Supabase, debe revocar sus sesiones y restablecer sus factores, conservando el rol y los datos de la cuenta. La siguiente entrada vuelve a exigir configuración. Esta operación debe autorizarse y ejecutarse expresamente; no se automatiza desde el panel ni se comparte la clave de otra persona. Mantener al menos dos responsables con autenticadores propios reduce el riesgo de quedar sin acceso.

## Validación y publicación

- `node scripts/verificar-mfa.mjs`: cobertura de todas las entradas.
- `node tests/sql/mfa-administradores.mjs`: PostgreSQL efímero, AAL1/AAL2, factores sin verificar/ajenos/eliminados, bloqueos, RLS y RPC.
- Workflow manual `mfa-admin.yml`: Supabase Auth/PostgreSQL reales y desechables en GitHub; TOTP RFC6238, códigos vencidos, factor ajeno, JWT modificado, peticiones directas a acciones reales, sesiones nuevas, recuperación y eliminación de factor; escritorio y Safari móvil, ES/EN. Sin credenciales ni tráfico de producción. Los artefactos excluyen sesiones, QR y claves.
- `playwright.mfa-cuenta.config.ts`: compatibilidad de Mi cuenta y menú con permisos administrativos simulados ya verificados; no sustituye la prueba de MFA real.

TOTP está habilitado en Supabase Producción; no se modifica la configuración de SMS. Tras pasar los checks y el workflow aislado, aplicar `20261019000400_mfa_administradores.sql` y desplegar inmediatamente el Worker. Las sesiones anteriores AAL1 deberán configurar/verificar su autenticador. No inscribir factores ni generar claves en nombre de administradores reales para probar producción.

Comprobación de producción: seis lecturas del smoke, sin crear sesiones/pedidos, cambiar contraseñas ni hacer cobros.
