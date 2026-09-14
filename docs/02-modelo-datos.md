# Modelo de datos propuesto · fase 1

Propuesta para revisión; no es un esquema aplicado en producción. UUID como identificadores, fechas `timestamptz` en UTC y presentación `America/Costa_Rica`. Importes `numeric`, nunca coma flotante. Borrado físico de documentos emitidos prohibido.

| Tabla | Campos principales | Relaciones y RLS propuesta |
| --- | --- | --- |
| `auth.users` | ID, correo y credenciales gestionadas por Supabase | Sin acceso directo desde la aplicación. Invitaciones administrativas, sin alta pública. |
| `perfiles` | ID de usuario, nombre, rol (`administrador`, `comercial`), activo | Usuario lee su perfil; administrador activo lee equipo. Nadie cambia su propio rol. Alta/cambio/baja vía función administrativa restringida. |
| `clientes` | UUID, tipo y número de identificación, nombre, teléfono, correo, dirección, notas, creador, archivado | Equipo activo lee y edita. Administrador archiva; no eliminar clientes con historial. Confirmar si se requieren carteras separadas. |
| `interacciones_cliente` | UUID, cliente, tipo (nota, incidencia, mantenimiento), fecha, descripción, responsable, próxima acción | Equipo activo lee; autor activo crea; edición registrada. No implementar contratos ni calendario en esta fase. |
| `cotizaciones` | UUID, cliente, número único, moneda, estado, versión, fecha emisión, vigencia, copia del cliente, alcance, exclusiones, motivo descuento, responsable, próximo seguimiento | Equipo activo lee; edita solo borradores. Emisión/aceptación/caducidad con funciones transaccionales y auditoría. RLS no concede cambio arbitrario de estado. |
| `lineas_cotizacion` | UUID, cotización, orden, tipo, descripción, cantidad, precio, tasa IVA, descuento; costo interno separado | Equipo activo accede solo mediante cotización permitida; modificar únicamente borradores. Cantidad positiva, valores no negativos y porcentajes acotados. |
| `costos_cotizacion` | línea, costo unitario, justificación comercial | Tabla separada, lectura restringida al equipo autorizado; nunca incorporada en DTO público/PDF. Política final de roles por confirmar. |
| `eventos_cotizacion` | UUID, cotización, actor, evento, fecha, cambios permitidos | Equipo activo lee; inserción solo por funciones de negocio; sin edición/borrado desde cliente. |
| `envios_correo` | UUID, cotización, clave idempotente, estado, ID del proveedor, intentos, próximo intento, error sanitizado | Equipo activo consulta estado. Servidor procesa cola mediante operaciones restringidas. Sin lectura pública ni edición directa. |
| `productos` | UUID, slug, categoría, título, descripción, imágenes, publicado, orden | Visitante lee solo publicados mediante vista con `security_invoker`; comercial lee; administrador edita. Costos/proveedor/stock interno en tablas privadas separadas. |
| `eventos_interaccion` | UUID, evento enumerado, ruta normalizada, fecha | Sin escritura directa anónima. Endpoint con validación, límite distribuido y límites de cuerpo. Administrador lee; no guardar IP cruda, parámetros URL ni texto libre. |
| `errores_cliente` | UUID, código/digest, ruta normalizada, fecha, versión aplicación | Mismo ingreso controlado; administrador lee. Evitar mensajes/stack con datos personales o credenciales. |

## Consecutivos e integridad
Asignar el consecutivo al emitir, con secuencia Postgres y restricción `UNIQUE`; las secuencias pueden dejar huecos y no se reinician. La emisión bloquea el documento, valida cliente/alcance/líneas, congela importes y crea un evento y salida de correo dentro de una transacción. Repetir la misma solicitud devuelve la misma emisión mediante clave idempotente. No calcular el siguiente número con `MAX()+1`. Una corrección de un documento enviado produce una revisión trazable, sin alterar el PDF previo.

Guardar importes y tasas vigentes por línea para que cambios de catálogo no alteren documentos anteriores. Proponer precisión de cantidad/precio y regla de redondeo explícita, con casos de prueba aprobados por contabilidad. CRC como propuesta inicial, USD opcional; no sumar monedas distintas en indicadores.

`enviada` se registra solo con aceptación del proveedor de correo (no implica lectura ni entrega final). Los fallos conservan el documento emitido y permiten reintento idempotente. `aceptada` requiere actor, fecha y evidencia; un clic genérico no prueba aceptación. `vencida` se deriva de la fecha solo si no fue aceptada, sin depender del navegador.

## Seguridad y verificación antes del módulo comercial
Funciones `SECURITY DEFINER` con `search_path` fijo, revocación de `PUBLIC` y permisos mínimos, sin SQL dinámico. Consultar rol/estado en tabla protegida, no en metadatos editables por el usuario. Indexar cliente, estado/vigencia, responsable/próximo seguimiento y claves foráneas. RLS no sustituye restricciones, triggers ni privilegios de columna.

Pruebas locales obligatorias: visitante sin lectura comercial; usuario inactivo denegado; comercial sin cambios de rol; imposibilidad de editar documento emitido; aislamiento de costos; dos emisiones concurrentes distintas; reintento del mismo envío; exportación sin notas/costos; eliminación de usuario sin pérdida del historial. Las pruebas y migraciones de desarrollo solo apuntan a loopback.

## Implementación de arranque
El primer SQL habilita únicamente `perfiles` y su control de lectura para preparar el acceso interno. Las tablas comerciales quedan documentadas hasta confirmar las reglas incompletas del texto original. No se presenta el panel como sistema comercial terminado. La ampliación confirmada de tienda, pedidos, administración e inglés se especifica en `04-tienda-pagos-y-admin.md`.
