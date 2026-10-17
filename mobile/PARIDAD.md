# Paridad web → Capacitor

La web es la referencia funcional y visual. La demo actual no acredita paridad. No se crearán diseños alternativos ni versiones reducidas de sus secciones.

## Inventario y orden de trabajo

Estado actual: todas las secciones en progreso mediante la vista de desarrollo de la web real. Ninguna se marca como paridad nativa terminada. El inventario cubre las 36 rutas actuales; también incluye el carrito, que no tiene una página independiente.

| Nº | Sección | Alcance |
|---|---|---|
| 1 | Inicio | Portada, accesos y contenido de inicio. |
| 2 | Tienda | Catálogo real, marcas, búsqueda, categorías, filtros, orden y paginación estable. |
| 3 | Detalle de producto | Fotos, especificaciones, precio, disponibilidad, asesoría y agregar al carrito. |
| 4 | Favoritos | Guardar, quitar, contador, avisos y persistencia. |
| 5 | Carrito | Panel lateral completo, cantidades, eliminar, total, persistencia y continuar compra. |
| 6 | Completar pedido | Información y entrega, datos adicionales y pago; validación, borrador y regreso desde cuenta. |
| 7 | Enlaces de compra | Resolver enlace corto, validar acceso y cargar la misma compra. |
| 8 | Confirmación y seguimiento | Resultado confirmado por servidor, estado, importes y comprobantes SINPE/transferencia. |
| 9 | Soporte | Servicios, proceso, preguntas frecuentes, instalaciones y contacto por WhatsApp. |
| 10 | Empresas | Planes, soluciones, necesidades, proyectos y contacto comercial. |
| 11 | Casos de éxito | Casos publicados, galerías, soluciones y consulta. |
| 12 | Nosotros | Presentación, principios, ubicación y contacto. |
| 13 | Contacto | WhatsApp, teléfono, correo, redes, Google Maps y Waze. |
| 14 | Cuenta | Ingreso, registro, código de seis dígitos, reenvío, recuperación, proveedores habilitados, mis compras, favoritos, datos, seguridad y cierre de sesión. |
| 15 | Información legal | Contenido vigente, enlaces y traducciones. |
| 16 | Acceso administrativo | Ingreso, activación y autorización por rol; /acceso redirige a /admin. |
| 17 | Inicio administrativo | Módulos disponibles según sesión y permisos. |
| 18 | Productos administrativos | Listado y operaciones del catálogo, validaciones y permisos existentes. |
| 19 | Proveedores | Información y operaciones de proveedores. |
| 20 | Contenido | Editor, imágenes, textos bilingües y configuración del sitio. |
| 21 | Pedidos administrativos | Búsqueda, filtros, contadores, detalle completo, estados, archivo, creación, enlaces, guías y comprobantes. |
| 22 | Usuarios | Usuarios, roles y operaciones autorizadas. |
| 23 | Estadísticas | Panel de métricas y controles existentes. |
| 24 | Vistas de prueba | Solo desarrollo: revisar diseños, disponibilidad, compra y correos; no exponer en menú comercial. |

## Entregas

1. **Base visual compartida:** validar primero la web real dentro de Capacitor con `sync:web`; para el cliente empaquetado, extraer presentación reutilizable de cabecera, menú, footer, componentes, traducciones y estilos web. Conservar el logo oficial, contenido blanco y cabecera/footer oscuros. Sustituir la navegación de demo; no cambiar la web para ajustarla a la demo.
2. **Páginas públicas:** inicio, soporte, empresas, casos, nosotros, contacto y legales con el mismo contenido y acciones.
3. **Comercio:** catálogo real, detalle, favoritos y carrito; adaptar acceso a datos sin duplicar las reglas de negocio.
4. **Cuenta y compra:** sesión, código, recuperación, retorno, tres pasos, enlaces, comprobantes y pagos sandbox.
5. **Administración:** todos los módulos con los permisos del servidor. No basta con ocultar botones.
6. **Cierre nativo:** enlaces de aplicación, archivos, retorno del banco, teclado, áreas seguras y pruebas físicas iOS/Android.

## Criterio para marcar una sección como verificada

- Mismos campos, información, contenido, acciones y estados que la web; sin formularios ficticios que sustituyan servicios existentes.
- Español e inglés, accesibilidad y preferencia de idioma persistente.
- Comparación visual contra la web a igual ancho; no reinterpretar el diseño.
- Pruebas de carga, vacío, error y éxito; sesión y permisos cuando corresponda.
- Navegación interna, Atrás, recarga y regreso desde segundo plano sin perder carrito o borrador.
- Evidencia de prueba en iOS y Android. Una prueba en navegador no acredita por sí sola funcionamiento nativo.
- Pagos solo sandbox y backend de pruebas aislado durante implementación.

## Seguimiento automático

`paridad.json` contiene rutas, alcance, estado y evidencias por sección. `npm run test:paridad --prefix mobile` compara el manifiesto contra todas las páginas reales de Next.js: falla si aparece una ruta sin inventariar, desaparece una registrada o se duplica. Una sección `verified` debe tener evidencias; el inventario completo no significa que la implementación esté completa.

## Estado y limitaciones

Validación de este bloque: 140 recorridos de página (35 rutas × 2 idiomas × 2 tamaños/motores), además del rechazo de acceso administrativo anónimo. Regresión funcional: 32 pruebas correctas y 4 omitidas por requerir Auth local conectado. Pruebas del cliente empaquetado y pantalla de desconexión correctas en Chromium/WebKit, 390 y 1280 px. `npm run verificar`, `npm run build` y compilación iOS Debug correctos. El build conserva la advertencia de trazado amplio de `.privado` en `admin-local.ts`. En el simulador iPhone 17 se verificaron arranque, áreas seguras, pantalla sin conexión y retorno tras reiniciar el servidor. Esto no acredita las operaciones externas ni una prueba completa de todas las pantallas en hardware nativo.

Implementado: inventario, guardia automática, modo local de Capacitor que carga la web original, servidor aislado y cuenta administrativa QA separada. Las 35 rutas se recorrieron en ambos idiomas, WebKit móvil y Chromium escritorio; el informe distingue los enlaces inválidos. iOS compila y muestra la web original respetando el área de la barra de estado. El cliente empaquetado sin servidor sigue siendo la demo: no se ha portado toda la web a un paquete autónomo. Faltan backend de pruebas, operaciones de cuenta/pedidos/pagos y validación nativa completa; Android Debug ya compila con JDK 21 local y SDK 36. No se ha publicado esta entrega.

### Avance de ciclo de vida y enlaces

- iOS y Android Debug compilan. Se registró el esquema de desarrollo `sgsolutions-dev://app` en ambas plataformas; su validación y manejo tienen pruebas automatizadas.
- La web real guarda el borrador al recibir el evento nativo de segundo plano y recupera el carrito al regresar. Ocho pruebas de navegador pasan en español/inglés y móvil/escritorio, incluido rechazo de datos de tarjeta en el borrador.
- Verificación general y build web correctos. `.privado` se excluye del trazado de archivos de producción para evitar incluir herramientas y evidencias locales.
- La apertura completa de enlaces en dispositivos y los retornos de banco/autenticación necesitan validación adicional. No se marca ninguna sección como paridad nativa completa ni se publica esta entrega.

Evidencia Android: APK instalado en el emulador dedicado `SGSolutions_QA`; el enlace de desarrollo abrió `/soporte` con la web real. Captura local: `.privado/mobile-testing/android-deep-link-soporte.png`. En iOS el esquema está registrado y el binario compila, pero la confirmación de apertura del sistema impidió acreditar el recorrido completo en esta ronda.

## Soluciones Empresariales

Soluciones Empresariales se integra como primera categoría de los filtros de `/tienda`, con cinco subcategorías y las marcas en el filtro habitual. La ruta anterior `/tienda/soluciones-empresariales` redirige a la misma tienda con la categoría seleccionada. Los equipos de Intcomex conservan confirmación de existencia y compra por enlace. Validación nativa completa pendiente, como las demás secciones.
