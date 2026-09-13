# SG Solutions

Base de la plataforma web: Next.js 16, React 19, TypeScript, Tailwind 4, next-intl, Supabase y Cloudflare Workers mediante OpenNext.

## Estado de esta entrega

- Portada con slogan bilingüe, iluminación propia con Motion/Three.js y accesos fotográficos con profundidad. Logo oficial en navbar y footer. Tienda, Soporte, Empresas, Nosotros y Contacto tienen páginas independientes; los enlaces internos navegan en la misma pestaña.
- Español e inglés con selector persistente y 508 claves traducidas.
- Tienda con 90 productos, nueve categorías, búsqueda, paginación, orden por precio y carrito persistente. El último archivo de Intcomex aportó 85 productos Lenovo: 82 nuevos y tres actualizaciones. Precios siempre en CRC, también en inglés.
- Soporte centrado en tareas de ayuda y Empresas organizado por necesidades, con fotografías reales de SG.
- Base de acceso interno por Supabase Auth y perfil activo, sin registro público.
- Configuración Supabase local y migración inicial de perfiles con RLS.
- Plantillas de workflows de revisión, despliegue manual, migraciones con simulación/respaldo y respaldo diario cifrado en `docs/automatizaciones/`.

**Todavía no es una tienda operativa:** falta confirmar disponibilidad propia, conectar la pasarela y gestionar pedidos. El pago se muestra deshabilitado. El editor de productos, categorías, textos bilingües y fórmula de precios está implementado; su guardado necesita Supabase y la segunda migración. Clientes, cotizaciones/PDF/correo y telemetría siguen pendientes. La conexión Auth/RLS no se ha probado localmente por ausencia de Docker. No hay servicios de producción configurados ni desplegados por este bloque.

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

La rama `main` representa producción, pero ningún push/merge publica automáticamente. GitHub rechazó la creación de `.github/workflows/` porque la conexión OAuth carece del permiso `workflow`; por eso los cuatro YAML están como plantillas en `docs/automatizaciones/` y **Actions todavía no está activo**. Después de que Isaac autorice `gh auth refresh -h github.com -s workflow`, moverlos a `.github/workflows/`, configurar los environments y subirlos. La rama local `codex/automatizaciones-preparadas` conserva la versión inicial con workflows en su ubicación ejecutable.

El despliegue requiere despacho manual, autorización actual de Isaac y environment protegido. No aplicar migraciones locales contra producción. Nunca versionar tokens, llaves, el documento comercial privado ni respaldos sin cifrar.

- [Portal fotográfico e iluminación](docs/11-portal-inmersivo.md)

- [Catálogo, precios y administrador](docs/12-tienda-catalogo.md)

- [Revisión visual y lenguaje](docs/13-acabado-y-lenguaje.md)

- [Integración automática de Intcomex: estado y activación](docs/15-integracion-intcomex.md)

La sincronización de catálogo/precios diarios e inventario cada hora está implementada para las nueve categorías, pero desactivada. Necesita credenciales IWS, Supabase configurado y la migración de sincronización. El Excel disponible solo contiene Lenovo y no incluye imágenes; no representa todo Intcomex. El administrador conserva sus cambios de contenido y precios manuales.
