# Administración local

Entrada: http://127.0.0.1:3107/admin. La ruta antigua `/acceso` redirige allí.

El modo local requiere `SG_ADMIN_LOCAL=1`, servidor de desarrollo y host localhost o 127.0.0.1. Está deshabilitado en builds de producción. La autenticación de producción continúa usando Supabase y perfiles autorizados; requiere configurar ese servicio antes de publicar el panel.

Para preparar una cuenta nueva: `node scripts/crear-admin-local.mjs correo@empresa.com`. El comando genera una contraseña, muestra el resultado una sola vez y no sobrescribe una cuenta existente. Solo almacena un hash scrypt con salt aleatorio. Los archivos se guardan en `.privado/admin-local`, excluido de Git, con permisos restringidos.

Las sesiones duran ocho horas y se revocan al salir. Cinco intentos incorrectos bloquean el acceso por cinco minutos. Los cambios se guardan localmente con control de revisión para evitar sobrescrituras desde pestañas antiguas. No modifican producción. Conservar esta carpeta como respaldo privado si se requiere mantener las pruebas.

El panel permite editar catálogo, categorías, precios, casos de éxito, textos bilingües y datos de transferencia. Las galerías admiten subida múltiple (JPG, PNG y WebP, hasta 8 MB), enlaces, vista ampliada, portada, orden y quitar con deshacer. Hasta 12 fotos por galería. Las fotos locales se guardan en `public/imagenes/admin`, fuera de Git; respaldar esta carpeta junto con los datos privados. En producción se usa Supabase Storage y requiere aplicar la migración `202609180001_imagenes_admin.sql`. No se ha ejecutado contra producción. Quitar una foto elimina su asociación, no el archivo físico, para no romper otros usos. No procesa cobros ni administra pedidos. La afiliación de tarjeta sigue pendiente.

Verificación: establecer `SG_PRUEBA_CLAVE` en el entorno y ejecutar `npx playwright test tests/admin-local.spec.ts --workers=1` con el servidor de desarrollo activo. No guardar la contraseña en archivos versionados.

## Revisión del 18 de septiembre de 2026

Se retiraron el bloque de estado de Intcomex del editor y el aviso de prueba local del login. El panel conserva la indicación del entorno local. El estado de carga se limita al panel para no ocultar contenido público durante el streaming de Next.js, incluso sin JavaScript.

Pasaron 106 pruebas locales entre la revisión general (102) y las cuatro pruebas de publicación administrativa, en escritorio/móvil y español/inglés. Estas últimas comprueban como visitante sin sesión los cambios de producto, precio, visibilidad, título de tienda, casos, textos y titular de transferencias, y restauran los archivos originales. Ejecutarlas con `npx playwright test tests/admin-publicacion.spec.ts --workers=1`; no ejecutar en paralelo otras pruebas que modifiquen los mismos datos.

También pasaron 94 pruebas públicas sobre el bundle de producción en Wrangler local, además de `npm run verificar` y el build de OpenNext. Esto no verifica Supabase remoto: todavía no existe un proyecto configurado y no se ha publicado este bloque.

Arquitectura recomendada para esta entrega: Cloudflare Workers para el sitio; Supabase Postgres, Auth y Storage para datos, acceso e imágenes administrativas. Cloudinary no es necesario para el alcance actual. Antes de publicar el panel, crear el proyecto de producción, aplicar las migraciones, configurar variables y usuarios autorizados, importar los datos aprobados y probar permisos, sesiones y publicación en un entorno aislado. Mantener los datos de localhost separados; la cuenta local no se convierte automáticamente en una cuenta de producción.
