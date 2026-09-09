# Referentes de diseño y áreas independientes

Investigación y aplicación: 9 de septiembre de 2026.

## Qué se buscó

Referentes tecnológicos reconocidos que combinan venta, asistencia y soluciones para negocios. La selección responde a su semejanza con las necesidades de SG Solutions; no constituye un ranking de tráfico o popularidad.

Se consultaron páginas oficiales de HP, Dell, Apple, Microsoft y Cisco. Además se inspeccionaron capturas de Apple Support, Microsoft y Cisco para contrastar la composición visual. Los sitios pueden cambiar por región, sesión o experimentos de diseño. No se asumió qué framework usan ni que abran todos sus enlaces en pestañas nuevas.

## Referentes y decisiones para SG

| Referente | Observación verificable | Idea de diseño para SG |
| --- | --- | --- |
| [HP](https://www.hp.com/us-en/home.html) | Su navegación distingue productos, Business Solutions y Support; soporte enlaza recursos en support.hp.com. | Separar compra, asistencia y empresas bajo la misma identidad. En la tienda, organizar las categorías por tipo de equipo y uso. |
| [Apple Support](https://support.apple.com/) | Encabezado breve, categorías de dispositivos y accesos directos a tareas habituales; la captura muestra mucho espacio libre y tarjetas sencillas. | Una página de soporte clara, con elección por problema, contacto y preguntas frecuentes. |
| [Dell Premier](https://www.dell.com/en-us/lp/dell-premier) | Presenta un espacio para comprar y gestionar tecnología de una organización. | En una futura etapa B2B, agrupar historial, pedidos y cotizaciones en el panel del cliente. Depende del backend; no está implementado. |
| [Microsoft](https://www.microsoft.com/en-us/) | La página consultada diferencia Personal y Business y presenta ofertas mediante grandes tarjetas visuales. | Dar identidad y jerarquía propias a cada área. Usar imágenes destacadas y textos cortos, adaptados al catálogo real. |
| [Cisco para empresas pequeñas y medianas](https://www.cisco.com/site/us/en/solutions/small-business/index.html) | Organiza soluciones de conectividad, seguridad y colaboración, con rutas para conocerlas y contactar expertos. | Presentar redes y seguridad como soluciones a necesidades de un negocio, acompañadas de proyectos reales y un contacto comercial claro. |

La combinación que recomiendo para SG es la separación de HP, la claridad de Apple Support y la orientación empresarial de Cisco. Microsoft aporta una referencia para la presentación visual de categorías. Dell aporta ideas para la operación comercial posterior.

Las observaciones describen las páginas consultadas; las propuestas de la última columna son decisiones de diseño propias. No se copiaron textos comerciales, logotipos ni fotografías de estos referentes a la app.

## Estructura aplicada

- `/`: entrada a las áreas, con las tres tarjetas y la escena SG. El contenido de servicios, planes y contacto se trasladó a páginas propias.
- `/tienda`: catálogo, filtros y carrito existentes.
- `/soporte`: presentación, elección de tema, pasos de atención, planes y preguntas frecuentes.
- `/empresas`: presentación empresarial, servicios, proyectos y contacto.
- `/nosotros`: presentación de SG y enlace a la ubicación.
- `/contacto`: WhatsApp, llamada, correo y ubicación física.

Los accesos del menú principal y de la portada abren pestañas nuevas por petición del usuario. Se usan enlaces HTML con `target="_blank"`, `rel="noopener noreferrer"` e indicaciones accesibles traducidas. Esto conserva la portada y permite abrir cada dirección directamente; no requiere dominios ni aplicaciones separadas. El enlace para volver al inicio navega dentro de la pestaña actual.

El soporte se solicita por WhatsApp. No se añadió un sistema de tickets, seguimiento de reparaciones ni un buscador de documentos inexistentes. La tienda conserva la limitación documentada de precios/stock/cobros pendientes.

## Idiomas como requisito permanente

Cada nueva página incluye español e inglés, selector de idioma compartido, encabezados, descripciones, metadatos y etiquetas accesibles traducidos. Las pestañas nuevas heredan la preferencia guardada en la cookie. Una pestaña que ya estaba abierta refleja un cambio hecho en otra al recargarse; no se añadió sincronización automática entre pestañas abiertas.

Se agregó `AGENTS.md` para que los cambios futuros mantengan esta obligación y la verificación de textos. El catálogo contiene 239 claves completas en ambos idiomas.

## Ideas siguientes, sujetas a contenido real

1. Tienda: fichas individuales, búsqueda, filtros por especificaciones y comparación cuando existan productos, precios y datos suficientes.
2. Soporte: base de ayuda consultable y seguimiento de solicitudes al implementar el backend correspondiente.
3. Empresas: casos de proyecto con necesidad, solución y resultado, usando evidencia proporcionada por SG.
4. Administración: edición de contenido y productos, prevista en el modelo de datos; no se presenta como disponible todavía.

No hace falta sumar otro motor de animación para estas mejoras. La escena de la portada y las transiciones existentes son suficientes mientras se desarrolla el contenido de cada área.

## Verificación de la entrega

TypeScript, ESLint, verificación de las 239 claves ES/EN y revisión heurística de secretos: correctos. Builds de Next.js y OpenNext/Cloudflare: correctos; permanece la advertencia previa de middleware Node experimental. Las 26 pruebas Playwright pasaron en escritorio y móvil, incluidas pestañas nuevas, aislamiento de `window.opener`, herencia de idioma, cambio y persistencia de idioma en todas las nuevas páginas, preguntas frecuentes y navegación inicial sin JavaScript.

Se inspeccionaron las capturas locales de soporte, empresas y contacto. La transferencia observada de la portada tras separar el contenido fue aproximadamente 0,39 MB en escritorio con 3D y 0,25 MB en móvil. No equivale a métricas de usuarios reales ni a Lighthouse. No se desplegó a producción.
