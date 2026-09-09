# SG Solutions

Base de la plataforma web: Next.js 16, React 19, TypeScript, Tailwind 4, next-intl, Supabase y Cloudflare Workers mediante OpenNext.

## Estado de esta entrega

- Portada con fotos reales, servicios, planes, empresa y contacto/Maps.
- Español e inglés con selector persistente y 167 claves traducidas.
- Tienda inicial por categorías, filtros y carrito persistente con cantidades.
- Base de acceso interno por Supabase Auth y perfil activo, sin registro público.
- Configuración Supabase local y migración inicial de perfiles con RLS.
- Plantillas de workflows de revisión, despliegue manual, migraciones con simulación/respaldo y respaldo diario cifrado en `docs/automatizaciones/`.

**Todavía no es una tienda operativa:** faltan catálogo vendible con precios/stock, pasarela y pedidos. El pago se muestra deshabilitado. El administrador de productos/ajustes, clientes, cotizaciones/PDF/correo y telemetría están planificados, no implementados. La conexión Auth/RLS no se ha probado localmente por ausencia de Docker. No hay servicios de producción configurados ni desplegados por este bloque.

## Desarrollo

Requisitos: Node 22.14+ (CI usa 24), npm y Docker compatible para Supabase local.

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
- [Resultados de verificación](docs/05-verificacion.md)

La rama `main` representa producción, pero ningún push/merge publica automáticamente. GitHub rechazó la creación de `.github/workflows/` porque la conexión OAuth carece del permiso `workflow`; por eso los cuatro YAML están como plantillas en `docs/automatizaciones/` y **Actions todavía no está activo**. Después de que Isaac autorice `gh auth refresh -h github.com -s workflow`, moverlos a `.github/workflows/`, configurar los environments y subirlos. La rama local `codex/automatizaciones-preparadas` conserva la versión inicial con workflows en su ubicación ejecutable.

El despliegue requiere despacho manual, autorización actual de Isaac y environment protegido. No aplicar migraciones locales contra producción. Nunca versionar tokens, llaves, el documento comercial privado ni respaldos sin cifrar.
