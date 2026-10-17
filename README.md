# SG Solutions

Base de la plataforma web: Next.js 16, React 19, TypeScript, Tailwind 4, next-intl, Supabase y Cloudflare Workers mediante OpenNext.

## Estado de esta entrega

- Portada con slogan bilingüe, iluminación propia con Motion/Three.js y accesos fotográficos con profundidad. Logo oficial en navbar y footer. Tienda, Soporte, Empresas, Nosotros y Contacto tienen páginas independientes; los enlaces internos navegan en la misma pestaña.
- Español e inglés con selector persistente y 592 claves traducidas.
- Tienda con 149 productos, nueve categorías, búsqueda, paginación, orden por precio y carrito persistente. Incluye solicitud de pedido con datos de contacto, retiro o entrega, revisión de códigos de fabricante y confirmación por WhatsApp. Precios siempre en CRC, también en inglés.
- Soporte centrado en tareas de ayuda y Empresas organizado por necesidades, con fotografías reales de SG.
- Base de acceso interno por Supabase Auth y perfil activo, sin registro público.
- Configuración Supabase local y migración inicial de perfiles con RLS.
- Plantillas de workflows de revisión, despliegue manual, migraciones con simulación/respaldo y respaldo diario cifrado en `docs/automatizaciones/`.

**Venta asistida:** el cliente reúne productos en el carrito y solicita asesoría por WhatsApp. El equipo prepara la compra desde Panel → Pedidos, confirma productos, cantidades y precios y comparte un enlace privado válido por 24 horas. El servidor exige esa aprobación para generar pedidos o iniciar pagos. Los pedidos SINPE/transferencia se guardan en el panel y permiten adjuntar comprobantes; el ingreso bancario se verifica manualmente. Los cobros reales por tarjeta siguen deshabilitados. Antes del despliegue, aplicar la migración de solicitudes de asesoría; consulte [el procedimiento y las pruebas](docs/catalogo/venta-asistida.md).

## Desarrollo

Requisitos: Node 22.18+ (CI usa 24), npm y Docker compatible para Supabase local.

```sh
npm ci
cp .env.example .env.local
npm run db:iniciar
npm run dev
```

Abrir `http://127.0.0.1:3107`. Sin llaves, el sitio público funciona y el acceso interno avisa que aún no está habilitado. Completar únicamente las llaves locales de Supabase en `.env.local`. El código rechaza URLs remotas si no se seleccionó explícitamente otro entorno. El wrapper local no imprime las credenciales producidas por la CLI.

Supabase Studio local: `http://127.0.0.1:54323`. Crear usuarios de prueba desde administración local y agregar sus perfiles: por defecto están inactivos. No copiar cuentas reales ni credenciales de producción. El SQL inicial no contiene usuarios ni contraseñas.

```sh
npm run verificar
npm audit --audit-level=low
npm run build
npx playwright install chromium
npm run test:e2e
npm run build:worker
```

Las pruebas usan exclusivamente loopback y guardan capturas/mediciones en `evidencias/` (ignorado). No necesitan ni usan Supabase remoto. Instalar compuerta local con `git config core.hooksPath .githooks`; el hook `pre-push` ejecuta TypeScript, ESLint y verificadores de textos/secretos.

`sharp` está fijado y unificado en 0.35.4 para corregir los avisos de seguridad encontrados en sus versiones transitivas. Volver a revisar compatibilidad al actualizar Next/OpenNext/Wrangler; no usar `npm audit fix --force` para bajar de versión la plataforma.

## Documentación

- [Plan de primera entrega](docs/01-plan-inicial.md)
- [Modelo de datos y RLS](docs/02-modelo-datos.md)
- [Cuentas, secretos y operación](docs/03-cuentas-y-operacion.md)
- [Tienda, pasarelas y administrador](docs/04-tienda-pagos-y-admin.md)
- [Resultados de verificación inicial](docs/05-verificacion.md)
- [Investigación de frontend](docs/06-investigacion-front-end.md)
- [Entrada interactiva](docs/07-entrada-interactiva.md)
- [Referentes, páginas independientes y verificación actual](docs/08-referentes-y-paginas.md)
- [Refinamiento visual de tienda, soporte y empresas](docs/09-refinamiento-visual.md)
- [Identidad y ondas de luz](docs/10-identidad-y-ondas.md)

La rama `main` representa producción. Los pushes y PR ejecutan `.github/workflows/pruebas-compras.yml` en GitHub con servidores, proveedores simulados y una base efímera; no despliegan el sitio ni reciben secretos de producción. Las pruebas nuevas de tienda, favoritos, filtros y cuentas están incluidas. `produccion-smoke.yml` es manual: realiza solo seis consultas HTTP de lectura después de un despliegue autorizado. El trabajo programado `eurocomp.yml` actualiza el catálogo real; es una operación de sincronización, no una prueba. Consulte [pruebas locales](docs/pruebas-locales.md).

El despliegue requiere despacho manual, autorización actual de Isaac y environment protegido. No aplicar migraciones locales contra producción. Nunca versionar tokens, llaves, el documento comercial privado ni respaldos sin cifrar.

- [Portal fotográfico e iluminación](docs/11-portal-inmersivo.md)

- [Catálogo, precios y administrador](docs/12-tienda-catalogo.md)

- [Revisión visual y lenguaje](docs/13-acabado-y-lenguaje.md)

- [Catálogo manual y venta asistida](docs/catalogo/venta-asistida.md)

Soluciones ofrece productos con asesoría: el carrito solicita atención y solo el enlace preparado por un asesor habilita la compra. El catálogo se administra manualmente. Se retiraron la importación Excel, sincronización IWS y extensión de Edge. Los productos fuera de la selección inicial se conservan como borradores.

### Comprobación del checkout antes de publicar

Ejecutar `npm run verificar:pedidos` con `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` del destino cargadas desde un almacén privado. La revisión es de solo lectura: comprueba las columnas usadas por pedidos, cuentas y correos, y que el bucket de comprobantes sea privado. Aborta si falta una migración. No sustituye las pruebas de restricciones, permisos ni del flujo completo.

Probar también la compilación Worker con Wrangler: Next local no reproduce todas las restricciones de Cloudflare. Eurocomp usa redirecciones manuales y rechaza cualquier respuesta 3xx, sin reenviar credenciales. Las operaciones disponibles son únicamente consultas de inventario.

Un entorno de pruebas remoto debe usar una base de datos independiente, credenciales de pago sandbox y correos controlados. Otro dominio conectado a producción no es un entorno aislado. En producción, las pruebas técnicas de pedidos deben identificarse como SIN PAGO y cancelarse; nunca enviar compras al proveedor ni marcar como pagado un comprobante sintético.

## Soporte técnico en el panel

La adaptación del paquete `deploy.rar` está en `/panel/soporte`: empresas, equipos empresariales o particulares, tickets con prioridad y responsable, mantenimientos preventivos/correctivos, historial, archivo/restauración e imágenes privadas. `/panel/soporte/reportes` resume tickets activos y mantenimientos pendientes, con cantidades mensuales. Reutiliza Supabase Auth y el permiso existente de administrador activo; no crea cuentas ni contraseñas del sistema anterior. El resumen de soporte es operativo y está separado de la medición de visitas anónimas.

El paquete recibido contiene una publicación .NET 10 / SQL Server, un esquema SQL y assets; no incluye `.sln`, `.csproj`, `.cs` ni `.cshtml`. Se examinó estáticamente y se adaptaron las entidades del esquema; no se ejecutaron sus binarios. Esto no es una reproducción certificada de todas sus reglas ni del portal de clientes/técnicos original. No se copiaron sus configuraciones, credenciales, bibliotecas o estilos globales. Usuarios/permisos permanecen en las secciones existentes del panel. Para cotejar el comportamiento exacto o migrar datos de una instalación anterior hacen falta el código fuente y una exportación autorizada de esa base; el archivo recibido no contiene registros para importar.

Antes de publicar, aplicar `supabase/migrations/20261017000300_soporte_tecnico.sql` al mismo proyecto Supabase del panel. Crea tablas con RLS, funciones administrativas, auditoría sin duplicar el contenido de las fichas y el bucket privado `soporte-privado`. La migración se aplicó y registró en Supabase local el 17 de octubre de 2026; se verificaron las seis tablas con RLS, el bucket privado y la ausencia de permisos anónimos. Requiere la base de perfiles y Storage existentes. Las imágenes se validan por contenido (JPEG, PNG, WebP), máximo 5 MB / 30 millones de píxeles y 10 por ticket; se entregan a través de una ruta autenticada sin URL pública ni tokens de descarga. No se admite HTML, SVG ni ejecutables. No activar un bucket público para estos archivos.

La edición usa versiones para detectar cambios simultáneos. Los registros se archivan, no se eliminan; los vínculos e historial se conservan. No se pueden crear relaciones nuevas con registros archivados ni cerrar tickets sin solución. Las opciones de empresa/equipo/ticket se limitan a 500 por selector; para catálogos operativos superiores se deberá añadir búsqueda remota paginada antes de ampliar su uso. Las listas principales tienen búsqueda y paginación de 25 registros. El historial muestra hasta 100 entradas recientes de los registros de la página, conservando el historial completo en la base.

Con el administrador local habilitado se pueden probar estas funciones en archivos bajo `.privado`, sin escribir en Supabase remoto. La interfaz avisa que son registros locales. Las pruebas usan una cuenta y una carpeta exclusivas, sin modificar las pruebas ni los datos existentes del usuario.

Comprobaciones dirigidas: `node tests/sql/soporte-panel.mjs` y `npx playwright test --config playwright.soporte.config.ts`. La primera comprueba permisos/RLS, relaciones, versiones, historial, adjuntos y archivo en PostgreSQL aislado; la segunda recorre los flujos de interfaz y las rutas privadas con el almacenamiento local de prueba, en escritorio/móvil y ambos idiomas. El harness `npm run test:compras` también recorre soporte con el Worker compilado y Supabase Auth/PostgreSQL/Storage reales, siempre locales y aislados; su resultado queda en el artefacto del job Worker de GitHub Actions. La regresión manual incluye el bloque `soporte`. No sustituye una comprobación posterior del esquema y Storage del entorno donde se publique.
