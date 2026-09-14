# Cuentas, secretos y operación

| Servicio | Qué debe disponer Isaac | Dónde se configura |
| --- | --- | --- |
| GitHub | Repositorio `contratacr/sgsolutions`, responsables y protección de `main` | Environment `produccion` con aprobación del dueño; permisos mínimos en Actions. |
| Cloudflare | Cuenta, Account ID, acceso DNS y token limitado a Workers/R2 del proyecto | Token y Account ID en secretos de GitHub; secretos de aplicación en Worker. No se requiere token global. |
| Supabase | Proyecto de producción, URL, llave pública, referencia de proyecto, conexión Postgres y token de automatización | URL/llave pública para aplicación. Conexión y token solo en Actions. Service role solo si la integración necesita una operación privilegiada. |
| R2 | Bucket de archivos, bucket privado de respaldos, endpoint S3, credenciales por bucket, dominio de assets | Secretos del servidor/Actions; nunca credenciales S3 en navegador. Respaldos privados, cifrados, con retención y prueba de restauración. |
| Brevo | Dominio remitente verificado, API key transaccional, remitente y destinatarios | Solo `src/lib/email/send.ts`; clave en Worker. Correos de negocio. |
| Resend | Dominio verificado y credenciales SMTP | Solo SMTP de Supabase Auth, no en código de negocio. |
| Dominio | Control de `sgsolutionscr.com`, hostname web y subdominio de assets | DNS en Cloudflare; SPF/DKIM/DMARC coordinados con correo existente. Confirmar antes de modificar registros. |
| Desarrollo local | Node 22.14+ o 24 LTS y Docker compatible encendido | CLI Supabase del proyecto. Copiar `.env.example` a `.env.local`, obtener llaves desde el entorno local sin imprimirlas en informes. |

No pegar contraseñas ni tokens en conversaciones. No almacenar el documento original (con reglas comerciales internas) ni originales de marca en el repositorio público. Solo se incluyen derivados de imágenes utilizados en la interfaz y documentación técnica sin cifras internas.

## Entornos
`local`: Next.js + Supabase CLI, URL obligatoria `localhost`/`127.0.0.1`. `produccion`: Worker y Supabase reales, con `SG_ENTORNO=produccion`. Futuro `test`: proyecto Supabase y Worker distintos. Preview temporal debe usar base de prueba, nunca producción; borrar el Worker al terminar.

## Automatizaciones
Los cuatro workflows están preparados como YAML en `docs/automatizaciones/`. GitHub exige el permiso OAuth `workflow` para permitir su publicación en `.github/workflows/`; la conexión actual no lo tiene. No hay automatizaciones activas todavía. Tras autorizar ese permiso, mover las plantillas a la ruta ejecutable y revisar su primera ejecución en Actions.

- Revisiones en cada push y PR: TypeScript, ESLint, catálogo de textos, detector de secretos y `npm audit`. Compilación y pruebas de navegador sin conexiones remotas.
- Despliegue manual: solo `main`, inputs explícitos y environment protegido. Compilar OpenNext; desplegar solo después de autorización actual de Isaac. No ejecutar automáticamente por un merge.
- Migraciones manuales: destino y simulación. Simular primero; para aplicar, exigir respaldo cifrado previo y aprobación del environment. Nunca ejecutarlas desde una máquina local contra producción.
- Respaldo diario: debe activarse cuando se configure el proyecto real, clave de cifrado, destino privado y retención. Sin secretos configurados, la acción debe omitir ejecución claramente; no simular éxito de un respaldo inexistente.

## Volver atrás
Guardar el ID de versión del Worker antes de cada despliegue. Para revertir aplicación: ejecutar rollback de Wrangler a esa versión desde un workflow manual aprobado. Las migraciones no se revierten automáticamente: crear una nueva migración correctiva compatible. Si hay pérdida de datos, restaurar respaldo en una base aislada, comprobar integridad y decidir recuperación antes de tocar producción. Documentar y ensayar el procedimiento antes del primer uso comercial.

## Referencias técnicas consultadas
- [OpenNext: configuración para Cloudflare](https://opennext.js.org/cloudflare/get-started)
- [Supabase: entorno local](https://supabase.com/docs/guides/local-development)
- [Supabase: clientes SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [next-intl: App Router](https://next-intl.dev/docs/getting-started/app-router)

La referencia visual aportada es [COCOCO](https://cococo.co.cr/). Usar categorías y navegación claras como criterio; SG Solutions necesita destacar asesoría y soporte por encima de una cuadrícula de precios.

## Configuración pendiente antes de operar
La web local usa `http://127.0.0.1:3107`. Crear environments `produccion`, `test` cuando corresponda y `respaldos`. `produccion` requiere aprobación del dueño. `respaldos` tiene credenciales limitadas a lectura de DB y escritura en bucket privado, sin aprobación por ejecución para permitir el horario diario. La variable de repositorio `RESPALDOS_ACTIVOS=true` habilita el cron únicamente después de la primera prueba de respaldo/restauración. Configurar retención en R2; el workflow no borra objetos.

Los respaldos incluidos son de Postgres; archivos R2, configuración Auth/SMTP, secretos y roles globales necesitan su propio plan de recuperación. Custodiar la clave privada de age fuera del repositorio y de los respaldos. El workflow solo necesita el destinatario público age.

OpenNext advierte que el soporte de proxy/middleware Node de Next.js es experimental en Cloudflare. El build no sustituye las pruebas con Auth real en un entorno aislado. Verificar renovación de sesión y cambios de rol en Worker antes de producción.
