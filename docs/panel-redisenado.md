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
