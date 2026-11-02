import {test} from 'node:test';
import assert from 'node:assert/strict';
import {contactoComercial,agregarReferenciaWhatsApp,referenciaConsulta} from '../../src/lib/contactos-comerciales-modelo.ts';
test('referencia WhatsApp conserva mensaje y teléfono, limita campañas y no duplica al repetir',()=>{
 const original='https://wa.me/50686065342?text=Hola%20SG';
 const r=agregarReferenciaWhatsApp(original,'/tienda/producto-x','sg_ventas_tienda_20261028','es');
 assert.equal(new URL(r).pathname,'/50686065342');
 assert.equal(new URL(r).searchParams.get('text'),'Hola SG\n\nReferencia: SG-TIENDA-VENTAS-2810');
 assert.equal(agregarReferenciaWhatsApp(r,'/tienda/producto-x','sg_ventas_tienda_20261028','es'),r);
 assert.equal(new URL(agregarReferenciaWhatsApp(r,'/tienda','','en')).searchParams.get('text'),'Hola SG\n\nReference: SG-TIENDA');
 assert.equal(referenciaConsulta('/empresas','correo@example.com'),'SG-EMPRESAS');
 assert.equal(agregarReferenciaWhatsApp('https://example.com','/tienda','','es'),'https://example.com');
});
test('contactos requieren confirmación, referencia interna, fuente permitida y fecha válida',()=>{
 const entrada={id:crypto.randomUUID(),revision:0,referencia:'CONSULTA-001',fecha:'2026-11-02',canal:'whatsapp',fuente:'sin_confirmar',etapa:'recibido',prueba:false,confirmado:true};
 assert.equal(contactoComercial.safeParse(entrada).success,true);
 for(const cambio of [{confirmado:false},{referencia:'nombre@example.com'},{fecha:'2026-02-30'},{revision:-1},{fuente:'utm_desconocido'},{etapa:'pagado'},{correo:'privado@example.com'}])assert.equal(contactoComercial.safeParse({...entrada,...cambio}).success,false);
});
