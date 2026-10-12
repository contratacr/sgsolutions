# Precios: comparación con el Excel, 12 de octubre de 2026

Archivo fuente revisado: `Copia de Calculos (004)v.xlsx`, hoja 1, celdas D5 e I5. No se modificó el archivo.

- D5: `B5*500*1.13*1.2`. Conversión de costo USD a CRC, IVA del 13% y recargo sobre costo del 20%. Con USD 13,90 resulta ₡9.424,20. La captura anterior de ₡9.266,67 no coincide con la fórmula del archivo recibido.
- G5: precio público elegido manualmente; no contiene una fórmula de redondeo.
- I5: `ROUNDUP(G5/(0.9*1.13),2)`. Con G5 = ₡9.500 resulta ₡9.341,20. Es un cálculo inverso que divide por 0,9 y por el factor de IVA; no es el precio público y no se utiliza como costo o precio de la tienda.

Para automatizar el ajuste comercial del ejemplo, la app redondea hacia arriba a ₡500 por debajo de ₡50.000; desde ₡50.000 mantiene pasos de ₡1.000. Esta regla es una decisión de implementación, no una fórmula presente en G5. Un precio manual explícito conserva prioridad.

La sincronización y la comprobación de Eurocomp llaman al mismo cálculo general. Se recalcularon 546 precios en Supabase local y en los catálogos locales de inicio/respaldo, preservando productos, stock, textos y pedidos existentes. La copia anterior del catálogo quedó en `.privado/qa-local/catalogo-antes-redondeo-excel.json`.

Se comprobaron 1.470 cálculos con aritmética decimal independiente, sin discrepancias. El catálogo local publica 1.469 productos. La copia de producción y el workflow horario no se modifican hasta publicar este bloque; después deberán regenerar el catálogo con el cálculo actualizado.

Verificación completada: seis pruebas de cálculo/política aprobadas, cuatro recorridos de ficha/cantidades/carrito en Chromium y WebKit (escritorio en español y móvil en inglés), precio consistente en listado y editor del panel en WebKit y comprobación visible en Safari instalado. `npm run verificar` (incluidos textos bilingües y secretos), build local y `git diff --check` aprobados. Las pruebas de interfaz esperan que termine la carga del panel antes de editar los filtros; el primer intento de búsqueda en WebKit se ejecutó antes de la hidratación.
