# Revisión de Supabase — 13 de octubre de 2026

Proyecto comprobado: `xkfiawkixcyzpfdwccxz` (SG Solutions Producción).

## Identidad y tablas necesarias

`auth.users` es la única fuente de identidad. Producción contiene 5 cuentas, con 3 identidades Google y 2 email. No se deben copiar contraseñas ni crear otra tabla de usuarios paralela. Las cuentas aparecen en Authentication > Users y el panel usa `listar_usuarios_panel`, que consulta esa misma fuente.

`perfiles` contiene permisos del equipo (1 fila), no todos los clientes. `perfiles_compra_clientes` se rellena al guardar datos de compra (0 filas al revisar); no necesita una fila vacía por registro. `estado_cuentas_usuario` contiene bloqueos/versiones y `gestiones_usuarios` la auditoría. Separar estos datos evita mezclar permisos con campos editables por el cliente.

Se conservan 13 tablas en public:
- Catálogo: catalogo_publico, catalogo_privado, eurocomp_privado.
- Contenido: contenido_publico, contenido_privado.
- Operación: pedidos_manuales, pedidos_tilopay, solicitudes_asesoria, correos_pago_tarjeta.
- Cuentas: perfiles, perfiles_compra_clientes, estado_cuentas_usuario, gestiones_usuarios.

`roles_clientes` e `historial_roles_clientes` estaban vacías y corresponden a segmentación comercial retirada. Se movieron a `sg_archivo`, sin acceso para anon/authenticated. No se borraron datos. La RPC antigua se archivó sin permiso de ejecución. La lista de usuarios no depende ya de esas tablas; conserva el campo de compatibilidad rol_cliente=particular. El historial administrativo puede leer registros archivados si existiesen.

## Correcciones aplicadas en producción

Migración `20261013000100_seguridad_y_archivo_roles.sql`, ejecutada en una transacción:
- Las políticas de datos de compra comprueban cuenta_habilitada, también frente a JWT emitidos antes del bloqueo.
- Subir imágenes exige es_administrador_activo, incluyendo estado bloqueado/baja.
- Revocados permisos explícitos de anon en RPC administrativas. Sus validaciones internas ya exigían autorización, pero Supabase mantenía algunos permisos EXECUTE directos pese al REVOKE PUBLIC.
- Las RPC exclusivas del servidor tampoco pueden ser ejecutadas por authenticated.

Las 13 tablas públicas tienen RLS. Ninguna RPC administrativa de la aplicación queda accesible a anon. `rls_auto_enable` es un event trigger del proveedor, no una RPC invocable; se conserva. Los buckets públicos de imágenes del sitio no deben confundirse con comprobantes privados.

## Validación y límites

- Prueba PostgreSQL aislada `tests/sql/seguridad-archivo.mjs`: preservación de identidades e historial archivado, listado administrativo, aislamiento entre clientes, denegación a clientes/bloqueados y permisos explícitos anon.
- API real: anon no puede leer perfiles, datos de compra, pedidos, auditoría, catálogo privado ni costos Eurocomp.
- Comparación antes/después: mismos 5 IDs, mismos hashes de perfiles y asociaciones de pedidos.
- Verificación de código/traducciones y build completos.
- Navegación de producción en escritorio y WebKit móvil, ES/EN.

No se crearon usuarios reales adicionales, no se hicieron cobros ni órdenes a Eurocomp. Esta revisión cubre esquema, RLS, privilegios de funciones y acceso de la aplicación; no constituye una auditoría independiente de penetración ni certifica toda la configuración externa de Auth/infraestructura.

## Reversión

Las tablas siguen en sg_archivo. Se pueden mover de vuelta con ALTER TABLE ... SET SCHEMA public, devolver la función asignar_rol_cliente al mismo esquema y restaurar las definiciones de listar_usuarios_panel/historial_gestion_usuario de la migración 20261012000200. Restaurar permisos solo si vuelve a habilitarse deliberadamente la segmentación comercial. No revertir el endurecimiento de cuentas bloqueadas ni de anon para recuperar las tablas. Respaldo privado: .privado/qa-local/respaldo-roles-20261013.json.

## Incidencia adicional observada

En la primera verificación de producción, Chrome recibió HTTP 503 / Cloudflare 1102 (Worker exceeded resource limits) en el inicio, en ambos idiomas; WebKit móvil pasó. La repetición de los dos recorridos Chrome pasó, y las consultas posteriores a inicio/cuenta respondieron 200. El tail posterior mostró outcome=ok, sin excepciones, con 106/298 ms de CPU. El diagnóstico posterior confirmó Workers Free (10 ms de CPU por solicitud) y eventos `exceededCpu` en el tail. Doce consultas acotadas a inicio, cuenta, tienda y catálogo devolvieron 503/1102. El usuario autorizó Workers Paid; la contratación está preparada y pendiente de que complete facturación/pago. No se debe dar producción por lista hasta confirmar la activación y repetir las verificaciones.

Se optimizó el resumen del catálogo, pasando de filtros anidados a un recorrido lineal; en la medición local del catálogo publicado pasó de 19,84 ms a 0,617 ms. También se evita normalizar descripciones en búsquedas vacías, recalcular slugs persistidos y validar el catálogo inicial cuando no se usa. Son medidas complementarias: no convierten Next.js en una aplicación compatible con el límite gratuito.

Las regresiones de catálogo y enlaces se incorporan a GitHub Actions. Las 16 pruebas del panel de usuarios con Auth simulado pasaron en WebKit escritorio/móvil, ES/EN. Las pruebas PostgreSQL aisladas verifican promoción administrativa y protección del último administrador, además de las restricciones de archivo/RLS.

El Worker compilado con los cambios pasó `npm run test:compras`: Supabase local real, SINPE, transferencia, almacenamiento de comprobantes, duplicados y tarjeta/callback simulados, Chrome/WebKit y ES/EN. Sin cobros reales ni escrituras al proveedor. Las cinco regresiones puras de catálogo/rutas y `npm run verificar` también pasaron.
