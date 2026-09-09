# Refinamiento visual

Se aplicó una composición más sencilla y elegante a las áreas independientes de SG Solutions, siguiendo los referentes documentados en [la investigación previa](08-referentes-y-paginas.md). Se tomó la claridad de navegación de HP, la orientación a tareas de Apple Support, el protagonismo de imágenes de Microsoft y la organización por necesidades empresariales de Cisco y Dell. Las fotografías y la identidad utilizadas pertenecen al material proporcionado de SG; no se copiaron fotografías ni marcas de los referentes.

## Cambios

- **Tienda:** cabecera dividida con fotografía de equipo, categorías visuales, tarjetas de producto con más espacio y búsqueda por nombre, descripción y categoría. La búsqueda ignora mayúsculas y tildes y se combina con el filtro seleccionado. Incluye resultados vacíos y restablecimiento. Cambiar de idioma reinicia consulta/filtro para evitar una búsqueda en el idioma anterior; conserva el carrito.
- **Soporte:** bienvenida centrada, acceso a WhatsApp y tres temas de ayuda visibles primero. La fotografía acompaña los pasos de atención. Planes y preguntas frecuentes mantienen su contenido bilingüe.
- **Empresas:** cabecera fotográfica, accesos a conectar/proteger/equipar, soluciones en filas y proyectos de videovigilancia y punto de venta.
- **Estilo compartido:** tipografía del sistema, jerarquía y espacios más consistentes, botones y superficies discretos. Se conserva la entrada 3D, su alternativa estática y el respeto a movimiento reducido.

Las páginas conservan su selector ES/EN. Los accesos del menú principal abren pestañas nuevas con el idioma elegido. La búsqueda es local sobre el catálogo inicial; no se agregaron precios, stock, cobros ni funciones administrativas ficticias.

## Verificación

- 262 claves coincidentes en español e inglés.
- TypeScript, ESLint y comprobaciones de textos/secretos correctos.
- Compilaciones Next.js y OpenNext/Cloudflare correctas. Sigue el aviso previo de soporte experimental del middleware Node en OpenNext; la renovación de sesión con Supabase permanece pendiente de validación.
- 28 pruebas de navegador correctas en escritorio y móvil: navegación independiente, pestañas/idioma, carrito, escena 3D y alternativas, búsqueda combinada con categorías y normalización de tildes.
- Capturas de tienda, soporte y empresas inspeccionadas; comprobaciones de desbordamiento horizontal correctas.

Disponible en el servidor local del puerto 3107. Sin despliegue a producción ni operaciones reales de pago, correo o base de datos.
