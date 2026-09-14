# Portal fotográfico e iluminación

La portada presenta el slogan en gran formato sobre iluminación azul y naranja. Los tres accesos pasan a ser tarjetas fotográficas amplias con categoría, título y acción permanente. El logo gráfico blanco oficial aparece en navbar y footer, sin repetirse en el hero.

## Referencias investigadas

- [React Bits — Chroma Grid](https://reactbits.dev/components/chroma-grid): tarjetas fotográficas, recuperación de color e iluminación al pasar el cursor.
- [React Bits — Light Pillar](https://reactbits.dev/backgrounds/light-pillar): iluminación como fondo de un encabezado protagonista.
- [Codrops — Gradient Mask Hover Effect](https://tympanus.net/Tutorials/AnimatedCodeBackground/): máscara luminosa vinculada al cursor.
- [Spline Examples](https://spline.design/examples) y [Unicorn Studio](https://www.unicorn.studio/): recursos para explorar composición e interacción.

La implementación utiliza las fotografías de SG y un shader propio. No incorpora plantillas, modelos descargados ni nuevas dependencias. Motion suaviza la inclinación de las tarjetas; CSS aplica color, zoom y foco; Three.js dibuja la iluminación en escritorio. En móvil se utiliza una composición estática y tarjetas compactas con las tres acciones visibles.

## Accesibilidad y navegación

Los enlaces mantienen rutas independientes y abren pestañas nuevas. Los textos y avisos accesibles están traducidos al español e inglés. El foco tiene contorno naranja. La preferencia de movimiento reducido desactiva las transformaciones, incluso si cambia durante la sesión. La iluminación puede pausarse y conserva un respaldo SVG sin WebGL. El acceso a las áreas funciona sin JavaScript.

Esta entrega sustituye la composición y la firma tipográfica del footer descritas en el documento 10. Los cambios permanecen locales, sin push ni despliegue.

## Validación

TypeScript, ESLint, 266 claves bilingües y revisión heurística de secretos correctos. Builds Next y OpenNext completados. Las 30 pruebas de navegador pasaron en escritorio y móvil, incluyendo navegación sin JavaScript, cambio de idioma, foco y movimiento reducido. Capturas revisadas en ambos idiomas. Persiste la advertencia experimental del middleware Node en OpenNext; no se realizó un despliegue ni validación nueva de Supabase/Auth/RLS.
