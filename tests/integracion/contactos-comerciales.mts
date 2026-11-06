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

test('Lenovo conserva su origen y reemplaza referencias anteriores sin duplicar',()=>{
 const original='https://wa.me/50686065342?text=Hola%20SG';
 for(const idioma of ['es','en']){
  const anterior=agregarReferenciaWhatsApp(original,'/tienda','sg_ventas_tienda_20261028',idioma);
  const actual=agregarReferenciaWhatsApp(anterior,'/tienda/laptop-lenovo-ryzen-5-82xm','sg_lenovo_82xm_20261105',idioma);
  assert.equal(new URL(actual).searchParams.get('text'),`Hola SG\n\n${idioma==='en'?'Reference':'Referencia'}: SG-TIENDA-LENOVO-0511`);
  assert.equal(agregarReferenciaWhatsApp(actual,'/tienda','sg_lenovo_82xm_20261105',idioma),actual);
  assert.equal(new URL(agregarReferenciaWhatsApp(actual,'/tienda','',idioma)).searchParams.get('text'),`Hola SG\n\n${idioma==='en'?'Reference':'Referencia'}: SG-TIENDA`);
 }
 assert.equal(contactoComercial.safeParse({id:crypto.randomUUID(),revision:0,referencia:'CONSULTA-002',fecha:'2026-11-05',canal:'whatsapp',fuente:'sg_lenovo_82xm_20261105',etapa:'recibido',prueba:false,confirmado:true}).success,true);
});
