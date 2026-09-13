# Tienda y catálogo — 9 de septiembre de 2026

Diseño compacto: navegación por categorías inspirada en [Intcomex](https://mkt.intcomex.com/webstore-renovado/), fichas enfocadas en producto como [Ubiquiti](https://store.ui.com/us/en) y selección limitada con espacio visual como [Apple](https://www.apple.com/shop/buy-mac). Implementación propia; no se copiaron plantillas.

## Selección inicial

Lectura manual de la sesión de Intcomex autorizada por el usuario, el 9 de septiembre de 2026. No hay sincronización automática. Las imágenes públicas se muestran desde las URLs observadas del proveedor. La disponibilidad del proveedor no representa inventario propio de SG.

| Producto | Código de fabricante |
| --- | --- |
| Lenovo ThinkPad L14 | 21H2S1NH00 |
| HP Victus 15-fa2014la | BA1U5LA#ABM |
| Lenovo ThinkVision S27-4e | 64BEKAR1LA |
| UniFi Switch Flex Mini | USW-Flex-Mini |
| UniFi Switch USW-24 | USW-24 |
| UniFi Protect AI Pro | UVC-AI-Pro |
| Lenovo 510 | GX30N81782 |
| Epson 544 Negro | T544120-AL |

Categorías: Cómputo, Redes, Seguridad, Accesorios y Oficina. La selección incluye precios promocionales observados, que deben revisarse antes de venta.

## Precios

Precio CRC = costo USD × (cambio + adicional) × (1 + IVA/100) × (1 + utilidad/100).

Valores iniciales: cambio 455,56 observado en Intcomex; adicional 50; IVA 13%; recargo de utilidad 20%. El 20% es recargo sobre costo, no margen bruto sobre venta. Ejemplo solicitado: USD100 × (450+50) × 1,13 × 1,20 = CRC67.800 antes de redondeo, y CRC68.000 como precio publicado.

Se redondea hacia arriba con tramos comerciales: ₡500 para precios menores a ₡50.000, ₡1.000 para precios menores a ₡250.000 y ₡5.000 para equipos de mayor valor. Un precio manual CRC tiene prioridad y se respeta como precio exacto. Español e inglés muestran siempre CRC. El carrito guarda identificadores y cantidades, y vuelve a tomar precios actuales del catálogo.

Los costos y la política comercial se conservan en el archivo local ignorado src/lib/catalogo-inicial.json y, una vez conectado, en la tabla privada de Supabase. El DTO público incluye solamente precios de venta y campos visibles. La base versionable tiene precios de venta manuales y costos nulos; los scripts previos a desarrollo, build y typecheck restauran el archivo inicial desde esa base si falta.

## Administrador

Ruta /panel/catalogo, restringida a usuario autenticado con perfil administrador activo.

Permite agregar, editar, ocultar y quitar productos; cambiar categorías; editar nombres y descripciones ES/EN; imagen, marca, código de fabricante, destacados, costo USD y precio CRC manual; modificar fórmula y textos de la tienda. Los cambios se publican al guardar. El SKU interno del proveedor no se muestra al cliente.

La acción de servidor valida el esquema y calcula el catálogo público. La migración 20260909000200_catalogo.sql separa datos privados/públicos, restringe acceso con RLS y guarda ambos en una transacción con control de revisión para evitar sobrescribir cambios de otro administrador.

Pendiente de infraestructura: Supabase no está funcionando en este entorno y Docker no está instalado. El guardado y las políticas SQL no se han probado contra una base real. No se implementó acceso público de prueba ni se debilitó la autenticación.

## Validación y límites

- TypeScript, ESLint, 325 claves ES/EN y comprobación heurística de secretos: aprobados.
- Build Next.js y bundle OpenNext/Cloudflare: aprobados.
- 34 pruebas Playwright de escritorio/móvil: aprobadas, con fórmula, prioridad manual, exclusión de costos públicos, búsqueda, idioma, carrito y redirección del administrador sin sesión.
- Capturas revisadas en evidencias/tienda-editorial-* y tienda-en-*.
- No se activaron cobros, se modificaron pedidos de Intcomex, se desplegó ni se hizo push.
