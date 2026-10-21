# Intentos de compra y conciliación Tilopay

Estado: pruebas aisladas aprobadas (18 casos de conciliación, PostgreSQL efímero y 4 vistas PC/móvil ES/EN). Migración aplicada en producción el 21 de octubre de 2026; publicación autorizada del bloque.

- Tarjeta sin aprobación: sección «Intentos de compra», fuera de pedidos por atender. SINPE/transferencia conservan su flujo de comprobantes.
- La tarea protegida del cron existente consulta Tilopay por referencia desde el servidor; no crea cobros. Ventana automática de 7 días, lotes de 12, intervalos de 15 minutos durante la primera hora, una hora durante el primer día y seis horas después, con reserva atómica. No depender del retorno del navegador.
- Solo aprobación código 1, referencia, importe, moneda y ambiente coincidentes permiten marcar pagado. Si Tilopay informa tipo/captura también se validan. Código 2 conserva rechazo; resultados desconocidos no se consideran pagos.
- Aviso interno después de al menos 30 minutos y consulta válida. Nunca presentar un intento como venta confirmada. Los fallos de consulta no generan aviso de abandono. No se envían mensajes automáticos al cliente.
- Los intentos existentes antes de la migración se concilian pero no generan correos retrospectivos. Solo los nuevos tienen aviso habilitado.
- La notificación de pago confirmado conserva su reserva por destinatario y se reintenta en segundo plano. Los fallos no deben perder la compra confirmada.
- Reserva atómica del aviso interno antes del envío. Rechazos explícitos de Brevo vuelven a pendiente; un resultado de envío incierto (o interrupción tras reservar) queda para revisión, sin reenvío automático. Se informa en el panel. No prometer entrega al buzón sin confirmación de Brevo.
- Los pagos de más de siete días requieren revisión manual; no se cancelan ni eliminan automáticamente. Un intento no confirmado no demuestra que el banco no cobró.

## Webhook pendiente de especificación del comercio

Tilopay documenta que `processPayment` dispone de webhook, pero solicita pedir su contrato y la verificación `orderHash` a soporte. No se inventa un endpoint ni una firma. La conciliación por API funciona independientemente de ese webhook.

Fuentes consultadas el 21 de octubre de 2026:
- https://tilopay.com/developers/api/webhooks
- https://tilopay.com/en/developers/api/procesos-operativos/consult

Borrador para soporte (no enviado):
«Solicitamos la especificación del webhook de processPayment para la integración de SG Solutions: configuración, payload, verificación orderHash, eventos de aprobación/captura/rechazo y reversión, reintentos, expiración de sesiones y límites recomendados de consult. No incluiremos credenciales por correo».

## Validación propuesta (requiere aprobación)

Base exclusiva y efímera de SG, no reutilizar el servicio local compartido. Proveedores simulados con bloqueo de red externa. Cubrir pago sin retorno, abandono, consulta fallida, discrepancias de monto/moneda/ambiente, duplicados/concurrencia, correo pendiente, pago posterior al aviso y exclusión del aviso para registros anteriores. Revisar PC/móvil y ES/EN. No ejecutar cargos ni correos reales.
