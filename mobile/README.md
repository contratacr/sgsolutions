# SG Solutions móvil

Base de Capacitor para iOS y Android, aislada del sitio Next.js. Rama: `codex/app-movil-capacitor`, creada desde `main`.

## Estado

**Nuevo modo de desarrollo con la web completa:** `npm run web` inicia Next.js aislado en el puerto 3140; `npm run sync:web` configura el simulador para cargar esa interfaz. Incluye todas las rutas inventariadas, cabecera, footer, catálogo, cuenta, compra y panel con su código original. No es una exportación de Next.js ni una app autónoma lista para distribuir. Sin backend conectado, cuentas externas y operaciones de pedidos/pagos permanecen sin servicio.

La meta es reproducir **todas las secciones de la web**, con el mismo diseño, contenido y funciones. La demo siguiente es una base técnica y no la interfaz final. El inventario, orden de entregas y criterios de aceptación están en [PARIDAD.md](./PARIDAD.md); el estado por sección está en `paridad.json`. Ejecutar `npm run test:paridad` para detectar páginas web que falten en el inventario.

- Capacitor 8.5.3, dependencias y lockfile propios.
- Identificador de desarrollo `com.sgsolutionscr.app.dev` y nombre `SG Solutions Dev` para distinguir la app de pruebas.
- App local bilingüe con catálogo ficticio, carrito y borradores de soporte/empresas; logo oficial y preferencia de idioma persistente.
- Sin servidor remoto, credenciales, servicios de pagos ni pedidos. La política CSP impide conexiones desde esta pantalla.
- Incluye tienda de demostración, pero no catálogo real ni checkout. Es una versión de desarrollo, no una app lista para publicar en tiendas.

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

### Revisar todas las secciones en el simulador

Desde la raíz, mantener una terminal ejecutando:

```sh
npm run web --prefix mobile
```

En otra terminal:

```sh
npm run sync:web --prefix mobile
npm run ios --prefix mobile
```

El script comprueba que el servidor sea el entorno aislado antes de sincronizar. La URL de desarrollo solo admite loopback; no acepta producción, dominios externos, credenciales ni rutas. Para un emulador Android ejecutar primero `adb reverse tcp:3140 tcp:3140` y luego el mismo `sync:web`; así conserva el origen loopback y las restricciones de las vistas locales. Android Debug compila; el recorrido funcional completo en Android sigue pendiente. Estas direcciones no apuntan al Mac desde un iPhone físico; ese recorrido requiere otro entorno de pruebas accesible.

La administración local usa una cuenta QA y archivos separados en `.privado/mobile-preview/`. Los datos de acceso generados están en `qa-login.json` dentro de esa carpeta; no corresponden a usuarios reales ni se imprimen en los logs. La cuenta local permite revisar los módulos, pero no simula servicios externos que no estén conectados.

La configuración se evalúa desde `capacitor.config.ts`. `npm run sync --prefix mobile` vuelve al cliente empaquetado de demostración cuando no está definida `SG_MOBILE_PREVIEW_URL`. Después de `sync:web`, los archivos nativos generados conservan la URL hasta la siguiente sincronización: **no archivar ni distribuir ese binario de desarrollo**.

El servidor usa `.next-mobile`, deshabilita cuentas remotas, correo, pagos y actualizaciones de proveedor; conserva el catálogo local disponible. No comparte almacenamiento de administración con la prueba web habitual. La app necesita el servidor activo y muestra una pantalla bilingüe de conexión si no puede cargarlo. iOS respeta las áreas seguras superior e inferior.

Pruebas de la web usada por el simulador:

```sh
npm run test:preview --prefix mobile
npx playwright test -c playwright.mobile-preview.config.ts
```

La primera recorre todas las páginas en WebKit móvil y Chromium escritorio, español/inglés, comprueba permisos administrativos y guarda capturas y un informe en `.privado/mobile-testing/web-preview/`. Los enlaces sin datos se verifican en su estado inválido: no se confunden con una compra completada. La segunda reutiliza regresiones de carrito, pasos de compra, retorno al ingresar, galería y paginación. Estas pruebas de navegador no sustituyen los recorridos en dispositivos físicos.

Referencias oficiales: [configuración](https://capacitorjs.com/docs/config), [instalación](https://capacitorjs.com/docs/getting-started), [entorno nativo](https://capacitorjs.com/docs/getting-started/environment-setup), [enlaces de aplicación](https://capacitorjs.com/docs/guides/deep-links).

## Verificación de esta base

`npm test` desde `mobile/` requiere las dependencias de desarrollo de la raíz (Playwright). Reconstruye el cliente, comprueba el estado y las traducciones y recorre catálogo, carrito y borradores en cuatro variantes Chromium/WebKit de móvil/escritorio.

Validado en este Mac: `npm run verificar`, build de Next.js, sincronización de Capacitor, pruebas de la pantalla local y compilación iOS Debug para simulador sin firma. Android Debug también compila con JDK 21 local y el SDK 36 instalado. Puede reproducirse con `npm run android:debug --prefix mobile`; admite `SG_MOBILE_JAVA_HOME` y `ANDROID_HOME` sin modificar la configuración global. Todavía no se han probado compras ni autenticación dentro de una app nativa.

## Entrega de navegación y catálogo de demostración

La pantalla inicial se reemplazó por una app cliente empaquetada, sin `server.url`:

- Tienda con cuatro productos ficticios, imágenes ilustrativas locales, búsqueda, categorías, orden por precio y detalle de producto.
- Navegación inferior entre tienda, soporte, empresas y carrito; rutas internas por hash y botón Atrás de Android que vuelve a la tienda o minimiza desde la raíz.
- Carrito con cantidades limitadas al stock ficticio, eliminación y subtotal. No hay checkout ni creación de pedidos.
- Borradores independientes de soporte y empresas, guardados al escribir; no se envían al negocio.
- Español e inglés en textos, etiquetas accesibles y título. Preferencia persistente.
- Persistencia mediante `@capacitor/preferences` en iOS/Android y su fallback web en las pruebas. Solo se guardan idioma, IDs/cantidades y borradores; no contraseñas ni tarjetas. Los borradores se eliminan con el botón correspondiente. Desinstalar elimina el almacenamiento nativo.
- Manifiesto de privacidad iOS con el motivo de uso de UserDefaults, incluido como recurso en el proyecto Xcode.

### Desarrollo

Editar `mobile/src/`, no los archivos generados de `mobile/www/`. `npm run build` empaqueta el JavaScript con esbuild y copia assets locales. `npm run sync` compila primero y luego sincroniza iOS/Android. `npm test` también reconstruye antes de ejecutar pruebas. La CSP continúa bloqueando conexiones de red.

### Validación de esta entrega

Pruebas de normalización de almacenamiento, límites de cantidades, subtotales y paridad de traducciones. Regresión Chromium y WebKit, 390 y 1280 px: navegación, catálogo, búsqueda/filtros, carrito tras recarga, borradores separados y eliminación, escape de texto, idioma persistente y bloqueo de red. Verificación general y build del sitio correctos. iOS Debug para simulador compila sin firma y se verificó su arranque y diseño en un simulador iPhone 17 dedicado. Android sincroniza con ambos plugins y genera el APK Debug con JDK 21 y SDK 36.

### Pendiente para una app operativa

Esta entrega permite revisar navegación y persistencia; no es una app comercial terminada. Falta configurar y verificar un backend de pruebas aislado, sustituir el catálogo ficticio por una API validada, autenticar y recuperar sesión de forma segura, enviar solicitudes reales de soporte/empresas, integrar pedidos y pagos sandbox y validar enlaces externos, adjuntos y retorno de autenticación. Después corresponde probar en dispositivos físicos, completar Android y preparar distribución con firma e identidad definitiva. No se han desplegado estos cambios ni activado cobros.

## Enlaces y conservación de la compra

La vista nativa de desarrollo admite `sgsolutions-dev://app/soporte`, `/tienda` y las demás rutas públicas autorizadas por `src/lib/ruta-app-nativa.ts`. Los enlaces mantienen el origen local; se rechazan destinos externos, administración y parámetros no permitidos. La integración escucha apertura de enlaces y retorno desde segundo plano. Universal Links/App Links de producción y retornos reales de autenticación/banco siguen pendientes.

Al pasar a segundo plano se guarda el borrador permitido de la compra; al volver se recupera el carrito persistido. No se almacenan campos de tarjeta. `mobile/tests/native-runtime.mjs` verifica validación, eventos, arranque y limpieza de listeners. `tests/capacitor-lifecycle.spec.ts` verifica el formulario y carrito reales en español/inglés, WebKit móvil y Chromium escritorio. Las ocho pruebas de ciclo de vida y persistencia pasan; no sustituyen pruebas físicas.

APK local de desarrollo: `mobile/android/app/build/outputs/apk/debug/app-debug.apk`. Requiere el servidor aislado y `adb reverse` después de `sync:web`; no es un paquete de distribución.

Android: instalación y apertura de `/soporte` mediante enlace verificadas en `SGSolutions_QA`. iOS: binario recompilado e instalado; apertura de enlace pendiente de completar la confirmación del sistema.
