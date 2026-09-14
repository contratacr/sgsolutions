# Investigación de frontend · SG Solutions

Fecha de consulta: 9 de septiembre de 2026. Alcance: propuesta técnica y visual; las tecnologías nuevas descritas aquí todavía no están instaladas ni implementadas.

> Actualización de implementación: ver [entrada interactiva](07-entrada-interactiva.md). Se utilizó Three.js directamente por la restricción de compatibilidad de Fiber con React 19.3.

## Recomendación

Conservar Next.js, React, TypeScript y Tailwind. Añadir Motion para las transiciones de interfaz y usar Three.js mediante React Three Fiber para una única escena 3D de la portada, cargada por separado. La navegación, búsqueda y compra deben funcionar independientemente de esa escena. Esta es una recomendación para SG Solutions, derivada de las capacidades documentadas y del proyecto actual; no una comparación de rendimiento medida entre librerías.

La elegancia dependerá principalmente de composición, tipografía, espacios, fotografías y consistencia. El movimiento debe destacar las acciones y la identidad de SG.

## Qué tomar de la referencia COCOCO

La captura aportada muestra una entrada que separa servicios con opciones grandes y una composición de apariencia tridimensional. Una captura no permite determinar si la imagen es un render fijo, un video o una escena interactiva.

Conservaría la elección clara del destino y mejoraría la información de cada opción: nombre, descripción breve y acción. Propuesta de primera sección:

| Destino | Texto orientativo | Acción |
| --- | --- | --- |
| Tienda | Computadoras, redes y seguridad para tu día a día. | Explorar productos |
| Soporte técnico | Ayuda con tus equipos e instalaciones. | Solicitar soporte |
| Soluciones para empresas | Conectividad, seguridad e infraestructura para tu negocio. | Conocer soluciones |

En escritorio: composición amplia con el logo blanco, titular breve y objeto tecnológico 3D a la izquierda; tres tarjetas de navegación a la derecha. Azul profundo, azul del uniforme y acentos naranja. Las tarjetas podrían cambiar sutilmente la iluminación de la escena al recibir foco o pasar el puntero.

En móvil: las tres opciones aparecen primero; la ilustración ocupa menos espacio y puede ser estática. El encabezado mantiene acceso a búsqueda de tienda, carrito, ES/EN y contacto. La portada continúa hacia proyectos, equipo y ubicación. Los enlaces directos a productos y servicios siguen disponibles sin pasar por una introducción obligatoria.

## Tecnologías comparadas

| Tecnología | Aporte concreto | Decisión para SG |
| --- | --- | --- |
| CSS: transformaciones, perspectiva y transiciones | Profundidad en tarjetas, cambios de color, desplazamientos y sombras. No requiere un motor de escenas. | Base visual para toda la interfaz. |
| Motion para React | Animación de componentes, entradas/salidas y cambios de distribución; carga diferida de funciones. | Motor principal de animación de interfaz. |
| Three.js + React Three Fiber | Objetos, cámara, luces y materiales 3D dentro de React. | Una escena de marca en la portada; ampliarla solo tras medir. |
| Spline | Edición visual de escenas e integración mediante su visor. | Alternativa para producir el 3D con un diseñador; evaluar condiciones de exportación. |
| GSAP + ScrollTrigger | Secuencias complejas sincronizadas con el desplazamiento. | Reservar para una futura presentación narrativa de proyectos. |
| Rive | Ilustraciones interactivas con estados y transiciones. | Opcional para diagramas o ayuda visual; innecesario para el menú inicial. |

Fuentes oficiales de las capacidades: [perspectiva CSS](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/transform-function/perspective), [Motion LazyMotion](https://motion.dev/docs/react-lazy-motion), [introducción de React Three Fiber](https://raw.githubusercontent.com/pmndrs/react-three-fiber/master/docs/getting-started/introduction.mdx), [Spline Viewer](https://docs.spline.design/exporting-your-scene/web/exporting-as-spline-viewer), [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), [máquinas de estados de Rive](https://rive.app/docs/runtimes/state-machines).

No propongo instalar todas estas herramientas. CSS y Motion cubrirían la interfaz; React Three Fiber cubriría el objeto 3D. Spline sería una alternativa de producción/integración del 3D. GSAP y Rive se justificarían únicamente por una interacción concreta.

## Detalles que cambian la decisión

**Motion.** LazyMotion permite separar la carga de funciones. Su documentación anuncia un mínimo inicial de 4,6 kB en una configuración específica; esa cifra no representa el peso completo de nuestra app. Configuraría `MotionConfig reducedMotion="user"` y una alternativa estática para la escena mediante `useReducedMotion`. [Carga](https://motion.dev/docs/react-lazy-motion) y [accesibilidad](https://motion.dev/docs/react-accessibility).

**React Three Fiber.** Su documentación empareja la versión 9 con React 19, familia que utiliza el proyecto. El renderizado bajo demanda permite dejar de dibujar cuando la escena está quieta; las animaciones activas todavía requieren cuadros. [Compatibilidad](https://r3f.docs.pmnd.rs/getting-started/installation) y [rendimiento, fuente oficial](https://raw.githubusercontent.com/pmndrs/react-three-fiber/master/docs/advanced/scaling-performance.mdx).

**Spline.** El visor carga por defecto cuando entra en pantalla; en una portada visible desde el inicio esto no supone aplazar la carga. Además, la documentación consultada sitúa la exportación autocontenida, con runtime y recursos, en el plan Enterprise. Conviene considerar esta condición antes de depender de esa exportación. [Visor](https://docs.spline.design/exporting-your-scene/web/exporting-as-spline-viewer) y [exportación para alojamiento propio](https://docs.spline.design/exporting-your-scene/web/exporting-as-self-hosted-project).

**Menús accesibles.** Para desplegables complejos, Radix Navigation Menu ofrece manejo de foco y navegación por teclado. Encaja con el ecosistema del proyecto, aunque ese componente específico aún no está instalado. Para las tres tarjetas iniciales bastan enlaces HTML correctamente diseñados. [Radix Navigation Menu](https://www.radix-ui.com/primitives/docs/components/navigation-menu).

## Diseño del movimiento y del 3D

Como criterio de diseño inicial, probar transiciones de aproximadamente 150–250 ms en botones y tarjetas, con elevación pequeña y foco visible. El carrito puede abrirse con una transición corta y confirmar la incorporación del producto mediante texto accesible. Evitar que cada sección tenga un efecto diferente.

Para el objeto protagonista propongo una composición original de conectividad: piezas que representan cómputo, redes y seguridad alrededor de la marca. Las fotografías reales siguen aportando evidencia del negocio en productos, proyectos y ubicación.

Los PNG y fotografías disponibles sirven como imágenes o texturas, pero no equivalen a modelos de productos que puedan girarse libremente. Un visor de un producto específico necesitaría su modelo 3D y autorización de uso. La primera escena puede construirse con geometrías propias sencillas sin inventar detalles de los equipos vendidos.

## Condiciones de implementación

1. Renderizar texto y enlaces desde el servidor. La escena vive en un componente de cliente aislado y se importa por separado.
2. Mostrar primero una imagen de respaldo con dimensiones reservadas. Mantenerla si el motor falla o no conviene habilitarlo.
3. Limitar resolución y complejidad gráfica, reutilizar materiales y geometrías, detener actividad al ocultarse la página y suspenderla fuera de vista. Usar renderizado bajo demanda mientras no exista movimiento. Son medidas basadas en la [guía de rendimiento de R3F](https://raw.githubusercontent.com/pmndrs/react-three-fiber/master/docs/advanced/scaling-performance.mdx).
4. Mantener las acciones fuera del canvas: accesibles con teclado, lector de pantalla y toque. La información no depende de pasar el ratón. Respetar la preferencia de movimiento reducido.
5. Probar móvil, escritorio, ES/EN, navegación y carrito; verificar también JavaScript retrasado, fallo de la escena y conexión lenta.
6. Medir antes y después. Objetivos: LCP ≤ 2,5 s, INP ≤ 200 ms y CLS ≤ 0,1 en el percentil 75, separando móvil y escritorio. Son umbrales de referencia, no resultados actuales de SG. Las pruebas de laboratorio ayudan a detectar regresiones; los datos reales requieren visitas. [Core Web Vitals](https://web.dev/articles/vitals).

## Administración y orden de trabajo

El futuro panel debe permitir editar títulos y descripciones ES/EN, imágenes, orden y visibilidad de las tarjetas, destinos permitidos y selección entre estilos visuales preparados. Un interruptor puede desactivar los efectos adicionales. Los cambios se validarían y previsualizarían antes de publicar; los objetos 3D y su comportamiento se mantendrían como recursos versionados.

Primero construir y revisar el menú con CSS y Motion. Después integrar la escena 3D y comparar rendimiento con la versión estática. Finalmente incorporar los controles administrativos cuando esté operativo el módulo de ajustes. La selección final de dependencias y versiones se comprobará al implementar. Este documento no cambia el estado pendiente de pagos, catálogo administrable ni autenticación de producción.
