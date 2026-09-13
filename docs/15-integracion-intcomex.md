# Integración Intcomex

## Entrega del 13 de septiembre de 2026

- Exportación recibida: `products.xlsx`, filtrada a Lenovo, 85 filas y 85 SKU distintos, sin URLs de imágenes.
- Carga inicial: 82 altas y 3 actualizaciones. Se conservan otros 5 productos existentes: 90 productos en total.
- Se preservan las variantes que comparten MPN pero tienen SKU distintos. El MPN se muestra al cliente; la vinculación al SKU permanece en los datos privados.
- Las 82 altas no traen fotografías. Se muestran con un marcador «Imagen no disponible», sin inventar imágenes de producto.
- Precios públicos en CRC con la fórmula y redondeos acordados. Los costos originales y el Excel permanecen en `.privado/` y `catalogo-inicial.json`, excluidos de Git. `catalogo-base.json` contiene una instantánea con precios de venta para builds de prueba.
- Consulta, búsqueda, orden y paginación en el servidor: 24 productos por respuesta; las otras páginas no reciben el catálogo completo. El carrito recupera sus productos por ID y no pierde artículos al cambiar de página.
- Panel con búsqueda y 20 productos por página, edición bilingüe y revisión de costos extraordinarios.

**No se han cargado todos los productos de Intcomex ni se ha activado la sincronización.** El archivo entregado cubre Lenovo únicamente. No hay credenciales IWS ni Supabase configuradas en este entorno o en los secretos del repositorio consultados durante esta entrega. Tampoco está disponible Docker para validar la migración contra una instancia local de Supabase.

## Las nueve categorías

| SG Solutions | Familias IWS |
|---|---|
| Computadoras | cpt |
| Redes | net |
| Seguridad | act, int, vis |
| Accesorios | cac, ccr, cpe |
| Oficina | prt, cns, com, prj |
| Punto de venta | pos |
| Software | sfw |
| Gaming | gam y equipos explícitamente identificados como gaming |
| Componentes informáticos | cco, sto, mem, mnt, ups |

Los códigos raíz provienen del catálogo del proveedor. Las categorías fuera de este alcance se omiten y se contabilizan; una categoría no reconocida no se asigna por defecto a otra. La primera conexión real debe reconciliar estos códigos con la cuenta de Costa Rica.

## Activación automática

1. Solicitar a Intcomex la habilitación de IWS para la cuenta comercial de Costa Rica. Canal publicado: `IWSIntegraciones@intcomex.com`. Se necesita API Key y Access Key; la sesión de WebStore no las sustituye. Confirmar si la cuenta requiere IP de salida autorizada; si así fuera, usar un ejecutor con IP fija autorizado por Intcomex.
2. Configurar Supabase, aplicar las migraciones y habilitar un administrador. Configurar las variables públicas de Supabase para el sitio y `SG_ENTORNO=produccion` o `test`, según corresponda.
3. En GitHub, guardar como **secrets**: `INTCOMEX_API_KEY`, `INTCOMEX_ACCESS_KEY`, `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`. Ninguno se debe poner en el repositorio, el navegador ni una variable `NEXT_PUBLIC_`.
4. Ejecutar primero una consulta de prueba con credenciales del ambiente correspondiente. Revisar conteos por categoría, moneda, traducciones, muestras de MPN, productos agotados y reglas comerciales.
5. La conexión GitHub actual no tiene el permiso `workflow`. Con una conexión que tenga ese permiso, mover `docs/automatizaciones/intcomex.yml` a `.github/workflows/intcomex.yml` e integrarlo a la rama predeterminada `main`, donde GitHub ejecuta los horarios. El push a `codex/base-plataforma` por sí solo no activa el horario. Establecer la variable de repositorio `INTCOMEX_SYNC_ENABLED=true` solo tras completar los pasos anteriores.

Horario preparado: catálogo ES/EN y precios diariamente a las 08:17 UTC (02:17 Costa Rica); inventario cada hora al minuto 17. GitHub puede retrasar ejecuciones programadas, por lo que no es una garantía de tiempo real. También hay ejecución manual desde Actions. No compra productos ni envía pedidos a Intcomex.

## Ejecución

Requiere Node 22.18 o posterior y dependencias npm instaladas.

```sh
# Validar y mostrar solamente conteos; no guardar.
node --experimental-strip-types scripts/sincronizar-intcomex.ts

# Actualizar la base configurada mediante una transacción con control de revisión.
node --experimental-strip-types scripts/sincronizar-intcomex.ts --aplicar

# Solo inventario.
node --experimental-strip-types scripts/sincronizar-intcomex.ts --inventario --aplicar
```

Sin `INTCOMEX_AMBIENTE=produccion`, el cliente usa el endpoint de pruebas. El workflow lo establece explícitamente en producción. La primera ejecución necesita la base de datos configurada incluso cuando se valida sin guardar, porque compara con el catálogo existente.

La extracción del Excel sirve solamente como arranque o contingencia, no como mecanismo recurrente. El adaptador valida las columnas del XLSX recibido y exige moneda explícita:

```sh
python scripts/extraer-intcomex-xlsx.py products.xlsx .privado/intcomex/entrada.json USD
node --experimental-strip-types scripts/sincronizar-intcomex.ts --archivo=.privado/intcomex/entrada.json --local --aplicar
```

## Reglas implementadas

- Firma SHA-256 con API Key, Access Key y fecha UTC, enviada en Authorization. La clave privada nunca se incluye en URLs ni logs.
- Solo endpoints de lectura de catálogo, precios e inventario. Reintentos acotados para 429/5xx, timeout y rechazo de respuestas vacías, parciales o con error.
- Mapeo de categorías, deduplicación por SKU, moneda explícita, valores negativos o inválidos rechazados y MPN obligatorio para publicar altas.
- Una actualización conserva contenido propio, categoría, imagen, visibilidad y precio manual. USD usa el tipo de cambio del administrador; CRC no se convierte nuevamente. El ajuste cambiario permanece bajo control del administrador y no se obtiene automáticamente del portal.
- El 20% vigente es recargo sobre costo; no margen bruto del 20%.
- Un cambio de costo mayor al 30% queda pendiente de revisión. Si no hay un precio manual, la tienda pasa a «Consultar» hasta aceptarlo en el panel y guardar.
- Stock del proveedor se distingue de stock propio. «Más de 20» se conserva como cota mínima, nunca como inventario exacto. Software ESD con cero unidades se muestra para consultar.
- Una importación parcial no elimina ausentes. En una actualización completa, los artículos previamente vinculados que no tienen datos válidos pasan a revisión, sin borrar contenido.
- La escritura automática y la del administrador comparten un candado y control de revisión. Si otro administrador guardó durante la consulta, la escritura falla con conflicto y debe reintentarse.
- El último resumen queda en los datos privados y los conteos de cada ejecución en Actions. No se registran costos ni respuestas completas del proveedor en los logs públicos.

## Límites y pendientes

- Fotografías automáticas: IWS ofrece `DownloadExtendedCatalog`, pero su referencia no especifica la estructura interna del archivo. Hace falta una muestra real de la cuenta para completar y probar el adaptador de imágenes; no se inventaron nombres de campos ni URLs.
- La persistencia sigue usando un documento privado y otro público con escritura atómica; admite hasta 20 000 productos y peticiones administrativas de hasta 32 MB. Superar esos límites aborta el lote, no lo trunca. Para catálogos mayores debe migrarse a filas por producto y consulta indexada.
- Se probaron transformaciones, firma, respuestas simuladas, preservación de ediciones, paginación, búsqueda y carrito. La autenticación real IWS, la migración SQL, la escritura remota y el horario quedan pendientes de las cuentas y credenciales indicadas arriba.

Fuentes oficiales consultadas:
- https://iws.intcomex.com/modelos/consultas-catalogo.html
- https://iws.intcomex.com/reference/api.html
- https://iws.intcomex.com/reference/iws-openapi-en.yaml
- https://iws.intcomex.com/

## Verificación de esta entrega

TypeScript, ESLint, 508 claves ES/EN y verificación de secretos pasan. El build de Next.js pasa. Se verificaron 52 pruebas en escritorio y móvil, incluyendo importación idempotente, conservación de cambios manuales, cálculo CRC, privacidad, paginación y carrito después de recargar. Las consultas IWS reales, la migración SQL y la ejecución programada quedan pendientes de credenciales y configuración; no se consideran probadas ni activas.
