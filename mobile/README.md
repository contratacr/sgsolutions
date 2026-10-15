# SG Solutions móvil

Base de Capacitor para iOS y Android, aislada del sitio Next.js. Rama: `codex/app-movil-capacitor`, creada desde `main`.

## Estado

- Capacitor 8.5.3, dependencias y lockfile propios.
- Identificador de desarrollo `com.sgsolutionscr.app.dev` y nombre `SG Solutions Dev` para distinguir la app de pruebas.
- Pantalla local bilingüe, preferencia de idioma persistente y logo oficial.
- Sin servidor remoto, credenciales, servicios de pagos ni pedidos. La política CSP impide conexiones desde esta pantalla.
- Todavía no incluye la tienda ni el checkout. Los proyectos generados son una base de desarrollo, no una versión lista para publicar en tiendas.

## Uso

Desde `mobile/`:

```sh
npm ci
npm run sync
npm run ios
# o
npm run android
```

Xcode debe estar disponible para iOS. Android requiere Android Studio, su SDK y Java compatibles con Capacitor 8. Los proyectos nativos se versionan; los archivos de compilación y dependencias se excluyen mediante sus `.gitignore`.

## Arquitectura y siguientes entregas

El sitio actual utiliza Server Components, Server Actions, cookies de servidor y rutas de API. No cambiar el sitio a `output: export`: eso eliminaría capacidades necesarias. La interfaz móvil empaquetada debe consumir servicios del backend mediante contratos explícitos.

1. Crear un backend de pruebas con base de datos, almacenamiento y cuentas separados. Usar datos ficticios; correo interceptado y pagos simulados o sandbox. Un dominio diferente por sí solo no aísla los datos. No conectar el cliente móvil hasta comprobar ese aislamiento.
2. Compartir modelos, validaciones, traducciones y componentes que no dependan del servidor. Crear la navegación cliente y el catálogo móvil.
3. Adaptar autenticación: sesión móvil, persistencia segura, cierre de sesión y retorno de Google mediante enlaces de aplicación. No asumir que las cookies de la web se comparten con la app.
4. Reutilizar las reglas de compra detrás de APIs autenticadas e idempotentes; validar precios y disponibilidad en el servidor. Mantener tarjetas y secretos fuera del código nativo y de los logs.
5. Probar Tilopay y 3D Secure en sandbox, incluido regreso a la app, cancelaciones y verificación del pago en el servidor.
6. Adaptar selección y descarga de comprobantes, permisos de archivos, WhatsApp, mapas y enlaces externos. Navegación interna dentro de la app; enlaces externos en el navegador o app correspondiente.
7. Agregar regresión en iOS y Android: español/inglés, sesión, carrito, tres entregas, tres pagos, adjuntos, enlaces de compra, teclado, áreas seguras, pérdida de red y retorno desde segundo plano.
8. Definir identificadores finales, firma, iconos de distribución y cuentas de publicación antes de preparar TestFlight/Google Play. No reutilizar la identidad de desarrollo como configuración final.

`server.url` de Capacitor es una herramienta de desarrollo/live reload, no la arquitectura de distribución elegida. No agregar la URL de producción a esta configuración.

Referencias oficiales: [configuración](https://capacitorjs.com/docs/config), [instalación](https://capacitorjs.com/docs/getting-started), [entorno nativo](https://capacitorjs.com/docs/getting-started/environment-setup), [enlaces de aplicación](https://capacitorjs.com/docs/guides/deep-links).

## Verificación de esta base

`npm test` desde `mobile/` requiere las dependencias de desarrollo de la raíz (Playwright). Comprueba identidad de desarrollo, ausencia de servidor remoto, bloqueo de conexiones, español/inglés, persistencia y cuatro variantes Chromium/WebKit en móvil/escritorio.

Validado en este Mac: `npm run verificar`, build de Next.js, sincronización de Capacitor, pruebas de la pantalla local y compilación iOS Debug para simulador sin firma. Android está generado y sincronizado, pero no compilado: no hay Java Runtime disponible y falta configurar el SDK. Todavía no se han probado compras ni autenticación dentro de una app nativa.
