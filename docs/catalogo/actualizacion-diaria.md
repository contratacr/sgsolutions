# Selección y actualización diaria de Intcomex

La lista confirmada contiene 104 códigos únicos. UI150FOR39 y ES600UBQ40 venían repetidos y se deduplicaron. La fuente utilizada por el panel es `src/lib/intcomex/seleccion.json`.

El código de fabricante DS-2CD1147G3-LIU(2.8mm) corresponde al SKU ES226HIK18, verificado en el catálogo público de Intcomex Costa Rica el 24/9/2026. Se admite cualquiera de los dos al identificar la selección. En la tienda se mantiene el código de fabricante; no se expone el SKU interno ni costos mayoristas.

## Operación sin IWS

1. Descargar una exportación reciente del portal Intcomex con la sesión comercial iniciada.
2. En **Panel → Productos → Actualizar inventario**, cargar el XLSX.
3. Revisar las cantidades y confirmar. No cambian costos, precios, imágenes, textos, categorías ni publicación. Las filas que no estén vinculadas se omiten, sin crear productos incompletos.
4. Hacerlo cada mañana y confirmar disponibilidad con el proveedor antes de solicitar el pago. La fecha mostrada acredita la carga, no la antigüedad de los datos del archivo.

El filtro de los 104 códigos está activado por defecto. El administrador puede desmarcarlo para mantener otros productos existentes. Un archivo parcial no pone los ausentes en cero. Una disponibilidad desconocida se conserva como desconocida; “Más de 20” es una cota mínima de 21, no una cantidad exacta.

## Incorporar productos

**Importar archivo de Intcomex** incorpora productos nuevos como borradores y busca fotos verificadas. Revisar categoría, fotografía, descripción y traducción antes de publicar. La selección y los códigos aún pendientes se ven en ambas pantallas. No se eliminan automáticamente los productos anteriores.

La revisión usada para previsualizar se verifica de nuevo al guardar: una edición concurrente obliga a revisar otra vez. La autorización de administrador se comprueba en el servidor. Los datos privados se guardan mediante la misma operación atómica del catálogo público.

Sin credenciales IWS, el servidor no puede descargar un inventario actualizado por sí solo. Se preparó un prototipo local de extensión para Edge en `extensions/intcomex-edge`, con pantalla `/panel/catalogo/sincronizar`. La extensión ya está instalada en Edge local y obtiene exportaciones reales desde la sesión del administrador. El flujo manual por Excel sigue disponible. La consulta con extensión actualiza disponibilidad y precios calculados, respetando los precios manuales; el importador de solo inventario mantiene los precios. La carga local del 24/9/2026 incorporó 100 de los 104 códigos con exportaciones autenticadas: 81 productos nuevos y 19 actualizados, todos con imagen. MM722LOG25, AN000ANK01, ES002EZV53 y MM005DJI20 no aparecen ni en las exportaciones por marca ni en búsquedas individuales; requieren confirmar el código con el proveedor. No se sustituyeron ni se marcaron como agotados. Las fuentes de las imágenes nuevas están en `fuentes-imagenes.json`. Esta carga todavía no se ha publicado en producción.

## Validación real del 24/9/2026 (local)

- Piloto de 3 productos: exportación automática desde Edge, vista previa y fórmula verificados.
- Cancelación tras 19 consultas: catálogo idéntico al respaldo, sin guardar.
- Consulta completa: 227 códigos revisados; 202 actualizados al confirmar; 25 sin coincidencia exacta conservaron sus datos. Revisión local 55 → 56; 230 productos totales, sin altas ni bajas.
- El portal devuelve a veces resultados aproximados para códigos con sufijos. Solo una fila con SKU exacto puede actualizar el producto; las aproximaciones se omiten y se muestran al administrador.
- Campos manuales, textos, fotos, categorías y publicación comparados antes/después: sin cambios.
- Vista pública comprobada para tres productos, escritorio/móvil y español/inglés. Pruebas automatizadas separan adaptador simulado, exportaciones reales y guardado real.
- No se publicó ni se modificó producción. Para usarlo allí falta habilitar el dominio de producción en la extensión, distribuirla al equipo y validar en ese entorno.

## Visibilidad y revisión

Una consulta completa válida marca los códigos exactos encontrados y los ausentes. Los ausentes dejan de aparecer en la tienda, pero conservan su publicación, precio manual, textos y fotos. Aparecen en **Panel → Productos → Requieren revisión**, con código y fecha. Si Intcomex vuelve a devolver un SKU exacto mediante la extensión o una importación manual que incluya precio y disponibilidad, reaparecen automáticamente. Una carga de solo inventario no los vuelve a publicar porque el precio seguiría sin verificarse. Si SG Solutions tiene inventario propio, el administrador puede indicarlo en la ficha para mantenerla visible independientemente de Intcomex. Un error de sesión, de formato o de conexión aborta el lote y no oculta productos. Se bloquea una consulta con más del 20 % de ausentes para evitar vaciar la tienda por un cambio del portal.

Los 25 códigos ausentes de la consulta real del 24/9/2026 quedaron marcados en el catálogo **local**. La revisión local avanzó de 56 a 57. Los Excel generados durante las pruebas se movieron de Descargas a `.privado/intcomex/seleccion-2026-09-24/descargas-limpieza/`; se conservó el `products.xlsx` anterior. La extensión se ajustó para evitar nuevas descargas cuando ya capturó el archivo, y se comprobó con un nuevo piloto real de tres productos.

## Automatización de producción

El flujo de Edge requiere una computadora y una sesión humana; no es la arquitectura definitiva para producción. La integración oficial IWS de Intcomex ofrece GetCatalog, GetInventory y GetPriceList. Intcomex recomienda catálogo una vez al día e inventario hasta cada hora. Solicitar a Intcomex la habilitación IWS para la cuenta de SG Solutions y sus claves de desarrollo y producción. Intcomex exige registrar las IP autorizadas para IWS. Por ello, la opción recomendada es un servicio pequeño con IP de salida fija y una tarea programada: consulta GetCatalog y GetPriceList a diario, GetInventory según la frecuencia acordada con Intcomex, guarda claves solo en secretos del servidor, actualiza el catálogo en Supabase y registra un historial visible en el panel. El equipo administrativo no abre Edge ni pulsa un botón cada mañana. Supabase Edge Functions no tienen IP de salida estática y no deben consultar IWS directamente si Intcomex exige lista de IP; un proxy de salida fija sería una alternativa, aunque añade complejidad. Antes de implementar se necesitan las credenciales IWS y confirmar con Intcomex los permisos de consulta y la IP. Una tarea programada sin credenciales IWS no puede obtener de forma confiable precios y existencias privados; no se debe automatizar el inicio de sesión del portal como sustituto de la API.

Referencias: https://iws.intcomex.com/modelos/productos-fisicos.html · https://iws.intcomex.com/webServices/integrate.html · https://iws.intcomex.com/materiales/documentacion.html · https://supabase.com/docs/guides/troubleshooting/why-supabase-edge-functions-cannot-provide-static-egress-ips-for-whitelisting-3d78b0
