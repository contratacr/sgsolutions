# Medición de SG Solutions

Implementación local, sin despliegue automático. No constituye un registro de ventas.

## Activación
1. Aplicar `supabase/migrations/20260922000100_analitica.sql` al proyecto correspondiente. La tabla tiene RLS, sin lectura pública; solo un administrador activo puede consultar el resumen.
2. El conjunto de datos web «SG Solutions - Sitio web» usa el ID público `1837501974261618`, configurado como valor predeterminado. `NEXT_PUBLIC_META_PIXEL_ID` permite sustituirlo por entorno; reconstruir/desplegar cuando se autorice. Nunca requiere un token de acceso en el navegador.
3. Probar con Meta Test Events tras aceptar publicidad. Confirmar que no hay solicitudes a Meta antes de consentir y que no se duplican PageView. El modo automático del píxel se desactiva; se envían solo eventos explícitos.
4. Revisar `/panel/estadisticas`. Si falta la migración, se muestra un estado de configuración pendiente, no estadísticas inventadas.

## Qué representan los datos
- Sesiones: identificadores aleatorios por pestaña; no personas únicas ni clientes identificados.
- Búsquedas: productos de los primeros diez resultados de cada consulta completada. No se guardan los términos libres introducidos.
- Carrito: clics efectivos para agregar, no unidades vendidas.
- WhatsApp y correo: apertura del canal; no prueba de que se envió el mensaje.
- Pedidos revisados: paso de revisión del formulario. No Purchase ni ingresos.
- Campaña: `utm_campaign`, solo códigos alfanuméricos con guion. No colocar datos personales en códigos de campañas.
- No se guardan IP, campos de formularios ni URLs externas con mensajes.
- Resumen de 30 días; los eventos anteriores se depuran al registrar nuevos eventos. Los agregados no representan todo el tráfico: consentimiento, bloqueadores y bots influyen.

## Alcance y próximos pasos
La API pública valida origen, consentimiento, tamaño y esquema. PostgreSQL limita 120 eventos por sesión/minuto y deduplica UUID. Es una medida básica: los clientes pueden falsificar sesiones; activar rate limiting de Cloudflare antes de campañas de alto volumen. Las estadísticas son orientativas y no deben usarse como contabilidad.

Para productos más comprados, registrar primero pedidos y estado de pago confirmado en servidor. Después emitir Purchase con moneda CRC, importe real e ID único, y considerar Conversions API con deduplicación. No enviar Purchase por un clic a WhatsApp.

No se agregó grabación de sesiones. PostHog puede complementar embudos y mapas de calor posteriormente, con enmascaramiento y consentimiento, si el análisis propio se queda corto.
