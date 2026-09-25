# SG Solutions · Intcomex — prototipo privado 0.1

Esta versión está instalada y validada con exportaciones reales en Edge local. No está publicada para producción y no es una integración oficial del proveedor.

## Instalación / Installation

1. En Edge abra `edge://extensions`, active el modo de desarrollador y seleccione **Cargar descomprimida / Load unpacked**.
2. Seleccione esta carpeta (`extensions/intcomex-edge`). Revise los permisos: Intcomex, scripts y almacenamiento de la firma del botón. No solicita cookies, historial ni contraseñas.
3. Inicie sesión en Intcomex Costa Rica en el mismo perfil. Abra `http://127.0.0.1:3107/panel/catalogo/sincronizar` en Edge.
4. Confirme que el Excel está en USD y pulse **Probar con 3 productos / Test with 3 products**. Si el exportador no tiene nombre reconocible, haga clic en Exportar Excel en la pestaña que se abre. La extensión recordará únicamente el HTML del botón que produjo el archivo.
5. Revise resultados y confirme el guardado. Tras una prueba completa se habilita consultar todos. El archivo se captura para el panel. La extensión evita la descarga local asociada a esa captura; otras descargas del usuario no se alteran.

Keep Edge open. Sign in again if the supplier session expires. The panel supports Spanish and English. Use the local panel only; production is intentionally absent from the manifest.

## Diseño y límites

- Extensión MV3. Una petición y pestaña por código, secuencial. No pedidos ni carrito.
- Intercepta temporalmente `URL.createObjectURL` en la pestaña de búsqueda para copiar el Excel exportado, sin consultar endpoints privados ni extraer credenciales. Restaura la función al terminar o expirar. El mecanismo se comprobó con el exportador real el 24/9/2026.
- Captura ZIP de hasta 4 MB; el servidor valida XLSX, cabecera y coincidencia exacta de SKU. Se exige una fila exacta, autorización de administrador y revisión vigente antes de guardar. Los resultados parecidos sin SKU exacto se excluyen y se informan como ausentes; dos filas para el mismo SKU bloquean el lote.
- El prototipo admite hasta 500 productos y 16 MB acumulados. Si cambia el portal, hay error o expira la sesión, no se guarda nada. No confundir consulta terminada con guardado.
- Archivo faltante no significa stock cero. Se conserva el producto ausente. El administrador ve los códigos no encontrados.
- Los textos, publicación, imágenes y precios manuales se conservan. Los nuevos productos del panel pueden vincularse mediante Código de Intcomex. No se importa todo el catálogo del proveedor.
- Consultar todos requiere una prueba satisfactoria en la misma visita. Cerrar el panel interrumpe la coordinación; reinicie la consulta. No es una tarea programada ni un servicio en segundo plano.
- Sin permisos globales, claves en la extensión, cookies copiadas al servidor, ni automatización de inicio de sesión. Publicar para producción exige configurar su dominio exacto y validar el piloto antes de distribuirla.

## Referencias investigadas

- Exportaciones: https://store.intcomex.com/Faq/pages/downloadPrices-es.htm
- Mensajería MV3: https://developer.chrome.com/docs/extensions/develop/concepts/messaging
- Scripts: https://developer.chrome.com/docs/extensions/reference/api/scripting
- Ciclo de vida: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
- Compatibilidad Edge: https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/api-support
