# Revisión visual de SG Solutions — 11 de octubre de 2026

Alcance: estética, jerarquía, espaciado, imágenes y adaptación móvil. No se modificó el flujo de pagos ni el contenido comercial. Se usó una escala coherente de espacios, tarjetas más contenidas y fotos visibles antes de textos largos. Referencias: [USWDS Cards](https://designsystem.digital.gov/components/card/), [Atlassian Spacing](https://atlassian.design/foundations/spacing/), [Baymard Product Lists](https://baymard.com/research/ecommerce-product-lists) y [Baymard Filters](https://baymard.com/blog/ecommerce-filter-ui).

1. **Inicio (`/`)**: portada fotográfica a pantalla completa con la navegación encima. Empresas inicia ligeramente más ancha en escritorio; cada ruta muestra solo su nombre y gana espacio al recibir cursor o foco. En móvil las tres rutas se apilan en la primera pantalla.
2. **Tienda (`/tienda`)**: reducir la separación de búsqueda/resultados, mostrar el catálogo sin área invisible mientras espera una animación y dar a las fotos un fondo uniforme. Los filtros, el conteo y la cuadrícula conservan el orden actual.
3. **Ficha de producto (`/tienda/[id]`)**: unificar el marco de la imagen con la superficie clara del catálogo y evitar que la columna de compra se desborde con nombres largos.
4. **Soporte (`/soporte`)**: compactar la portada y sus tres beneficios en móvil; conservar el contraste entre la acción principal y el resto del contenido.
5. **Empresas (`/empresas`)**: hacer más visible la foto de portada en móvil y usar iconos diferentes para conectar, proteger y equipar.
6. **Casos de éxito (`/casos-de-exito`)**: reducir los marcos de las historias y mostrar la foto antes del párrafo extenso en móvil.
7. **Nosotros (`/nosotros`)**: mostrar la oficina primero en móvil; colocar los accesos a Maps y Waze en una fila cuando el ancho lo permite.
8. **Contacto (`/contacto`)**: reducir la altura de las tres tarjetas y mantener distinguibles WhatsApp, llamada y correo.
9. **Carrito y compra (`/finalizar-compra`)**: contener el ancho del estado vacío y la acción para regresar; se mantiene el formulario de compra sin cambios de flujo.
10. **Enlace de compra y estado del pedido (`/compra/[acceso]`, `/finalizar-compra/pedido`, `/finalizar-compra/resultado`)**: revisar consistencia de tipografía, tarjetas y botones con la compra; sin cambios adicionales al flujo.
11. **Términos (`/terminos`)**: mantener índice y ancho de lectura; no se detectó necesidad de rediseño.
12. **Privacidad (`/privacidad`)**: mantener el mismo patrón de lectura que Términos; no se detectó necesidad de rediseño.
13. **Acceso al panel (`/acceso`, `/admin`, `/admin/activar`)**: mantener la tarjeta de autenticación centrada y el lenguaje visual del panel.
14. **Inicio del panel (`/panel`)**: compactar módulos, unificar radios y dar una respuesta visual clara al foco y al hover.
15. **Catálogo y proveedores (`/panel/catalogo`, `/panel/proveedores`)**: conservar la jerarquía de formularios y dar espacio propio al indicador de los desplegables.
16. **Contenido, pedidos y estadísticas (`/panel/contenido`, `/panel/pedidos`, `/panel/estadisticas`)**: aplicar el mismo tratamiento de módulos, formularios y desplegables para que las vistas sigan un sistema visual único.

Comprobación: rutas públicas en 390 y 1440 px, español e inglés; sin desbordamiento horizontal en las rutas revisadas. La revisión visual del panel se basó en sus componentes y estilos; la vista privada requiere una sesión de administrador para inspección manual completa.
