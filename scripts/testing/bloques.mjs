// Registro de pruebas aisladas. Diagnósticos reales de Meta y producción quedan fuera.
const sql=['conciliacion-tarjeta','campanas-conversiones','mfa-administradores','estadisticas-panel','favoritos-empresariales','referencias-pedidos','pedidos-archivo-express','archivo-panel','autogestion-cuenta','estado-entrega','eurocomp-manual','favoritos','perfiles-compra','popularidad-catalogo','popularidad-productos','seguridad-archivo','soporte-panel','usuarios-panel'];
const integraciones=['campanas-contrato','campanas-transporte','conciliacion-tarjeta','plazo-correos','retiro-pago','catalogo-red'];
export const bloques=[
 ['verificar',['npm','run','verificar']],
 ['inventario',['node','--test','tests/testing/inventario.test.mjs']],
 ['build',['npm','run','build']],
 ...sql.map(n=>['sql-'+n,['node',`tests/sql/${n}.mjs`]]),
 ...integraciones.map(n=>['integracion-'+n,['node','--conditions=react-server','--import','tsx',`tests/integracion/${n}.mts`]]),
 ...['cuenta-panel','eurocomp','disponibilidad','fondos','inicio-movil','modales','pedidos-propuesta','checkout-pasos','correos-diseno','mobile-preview','regresion','comprobantes','catalogo','tilopay-hosted','empresas-correo','entrega','confirmaciones','contenido','google','codigo','estadisticas','eurocomp-manual','soporte','conciliacion','privacidad','exclusion-admin','mfa-clientes','software','referencias','plazo-panel','publicas','frontend','compras-matriz'].map(nombre=>[nombre,['npx','playwright','test','--reporter=list,json,html',`--config=playwright.${nombre}.config.ts`]]),
];
