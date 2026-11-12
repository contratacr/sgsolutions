# Rediseño administrativo — noviembre de 2026

El rediseño mantiene las operaciones, permisos y validaciones existentes. Los estilos están limitados al panel y a sus diálogos; la tienda pública no hereda este diseño.

## Secciones

1. **Inicio:** accesos agrupados en Operaciones, Tienda y contenido, y Resultados.
2. **Productos:** listado, búsqueda y estados con jerarquía uniforme. El editor separa información e imágenes de publicación, precios y existencias. Dos columnas en escritorio, una en móvil; acciones de guardado accesibles.
3. **Categorías:** tarjetas en una cuadrícula adaptable, conservando los campos de ambos idiomas y la protección de categorías utilizadas.
4. **Proveedores:** búsqueda, tarjetas del catálogo y paginación alineadas. Sin cambios en sincronización o reglas comerciales.
5. **Contenido:** pestañas, formularios y bloques desplegables con espaciado uniforme.
6. **Pedidos:** filtros, encabezados y detalles expandidos diferenciados visualmente; no cambian estados, cobros ni avisos.
7. **Soporte:** búsqueda, registros, datos y formularios de edición con el mismo sistema visual.
8. **Usuarios:** búsqueda, tarjetas y diálogos consistentes. Los permisos y MFA se conservan.
9. **Estadísticas:** períodos, métricas, gráficos y tablas con mejor jerarquía; números alineados. Sin cambios en captura ni atribución.

## Validación local

- `playwright.contenido.config.ts`: claridad del panel, productos manuales, edición de contenido, inventario y fechas de ofertas.
- `playwright.soporte.config.ts`: empresas, equipos, tickets, mantenimientos, adjuntos, archivo y acceso.
- `playwright.entrega.config.ts`: estados de entrega, archivo, enlaces de compra, bandeja y estabilidad de estilos.
- `playwright.estadisticas.config.ts`, `estadisticas-panel.spec.ts`: períodos, recuperación de errores, preferencias y exclusión administrativa.
- Recorridos en Chrome de escritorio y WebKit móvil, en español e inglés, con fixtures aislados.
- Las pruebas de conteo anteriores al aviso de privacidad se actualizaron para expresar la elección vigente; no se alteró el comportamiento de producción para satisfacerlas.
- La prueba de pestañas de Pedidos verifica que el desplazamiento permita llegar a la última opción, incluso si el borde visible coincide con un espacio entre etiquetas.

Esta ronda no realiza pagos, no modifica usuarios o pedidos reales y no sustituye una regresión completa de toda la aplicación.

## Segunda ronda — 11 de noviembre de 2026

- **Usuarios:** filtros Todos, Administradores, Clientes, Bloqueados y Sin confirmar, compatibles con la búsqueda y la paginación. Requieren la migración `20261111000100_filtro_usuarios_panel.sql`, que se aplica con el workflow *Migraciones controladas*: primero en simulación y luego con respaldo. Mientras no se aplique, Todos y la búsqueda funcionan igual que antes y los filtros muestran un aviso. Prueba SQL aislada: `tests/sql/filtro-usuarios.mjs`.
- **Asesorías:** un enlace de compra aprobado y vencido se puede archivar directamente. En el mismo cambio queda cancelado y el diálogo lo advierte. No requiere migración, porque el trigger de archivo ya acepta el estado `cancelada`.
- **Tienda:** los filtros esperan a que la página termine de cargar antes de aceptar clics, como ya ocurría con Ordenar. Antes, un toque en ese momento se perdía o se sobrescribía al restaurar la URL. Al cargar la tienda también se elimina el historial de recomendaciones de versiones anteriores, y la regla de mínimos de venta tolera instantáneas sin categoría.
- **Pruebas actualizadas al comportamiento vigente:**
  - el aviso de privacidad del 3 de noviembre (consentimiento explícito)
  - los mínimos de venta de 726a6dc
  - la limpieza de la categoría padre al quitar una subcategoría
  - la recarga al volver a la pestaña, limitada a cada 30 s
  - la selección que se guarda en la URL
  - el orden del listado, que no usa historial (934cca2)
  - el conteo de fotos verificadas
  - las sugerencias de búsqueda, que se cierran con Escape antes de elegir un producto
- **Se decidió no hacer:**
  - **Versión por usuario:** la edición de datos ya compara nombre y correo con Auth antes de guardar.
  - **Borrado automático de imágenes sin uso:** sería irreversible y una foto puede seguir referenciada en correos enviados o en contenido archivado.
  - **Texto alternativo por foto de producto:** la foto principal usa el nombre del producto y las miniaturas tienen nombre accesible.

### Publicación — 12 de noviembre de 2026

- Commits `0a01ca9` y `c9ff582` en `main`; CI de seguridad aprobado. La ruta del comprobante usa ahora el patrón de autorización que exige `scripts/verificar-mfa.mjs`.
- Worker desplegado: versión `04d15c25-ec7e-4f17-9aa7-79c7210b16aa`. Versión anterior para revertir: `d1ed980e-c4bd-4cd4-a7c2-e3c85fcd0e07`.
- Smoke de producción: seis comprobaciones de solo lectura aprobadas.
- Migración `20261111000100_filtro_usuarios_panel.sql` aplicada en Producción el 12 de noviembre de 2026 desde el SQL Editor. Verificado: solo existe la firma `(text,integer,text)`, `anon` no la ejecuta, sigue como security definer con `search_path` vacío. Nota: el historial de migraciones de Supabase está vacío, así que no usar `db push` contra Producción.
