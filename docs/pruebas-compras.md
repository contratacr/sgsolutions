# Pruebas de compras

Ejecute `npm run test:compras` con Supabase **local** iniciado. El comando usa
`.privado/qa-local/conexion.json`, o el archivo indicado en `TEST_SUPABASE_CONFIG`.
Para obtener ese archivo: `npx supabase status --output json` y guardar la salida
privadamente. El comando rechaza cualquier URL distinta de `http://127.0.0.1:54321`.

La prueba crea un espacio temporal, compila el Worker de Cloudflare y lo ejecuta
con Wrangler local. Usa PostgreSQL, Auth y Storage locales; sustituye Eurocomp,
Tilopay y Brevo por un servidor de pruebas. No necesita credenciales de producción.
El entorno elimina variables de producción heredadas y usa credenciales ficticias
para esos servicios. El simulador rechaza operaciones de compra al proveedor.

Cubre precio/stock, mínimo de 15, SINPE y transferencia, escritura real del pedido,
comprobante privado y duplicado, doble envío del mismo pedido, fallo de correo,
pago con tarjeta aprobado/rechazado y callback repetido. Recorre el formulario y
la confirmación en Chromium y WebKit, español/inglés y escritorio/móvil. Restaura
el catálogo local original y limpia sus registros de prueba al finalizar.

La configuración de prueba omite `global_fetch_strictly_public` para permitir los
servicios de loopback. Conserva el Worker compilado y `nodejs_compat`. La
configuración de producción no cambia.

GitHub Actions ejecuta `.github/workflows/pruebas-compras.yml` en pushes a main,
pull requests y ejecuciones manuales. Arranca una base efímera desde las migraciones,
no usa secretos del repositorio y guarda únicamente un resumen sin credenciales.
Una prueba fallida impide que el chequeo sea verde; el workflow no despliega la web.
Configure el chequeo como obligatorio para integrar cambios en main cuando se
active la protección de la rama.

Una prueba verde no demuestra que las credenciales, permisos o disponibilidad de
proveedores de producción sean correctos. Antes de publicar deben verificarse
configuración y esquema en producción con `npm run verificar:pedidos` usando la
conexión autorizada, sin imprimir credenciales. Los fallos reportados por clientes
requieren capturar su código HTTP y añadir un caso de regresión específico.

Referencias: https://developers.cloudflare.com/workers/testing/ y
https://supabase.com/docs/guides/deployment/ci/testing
