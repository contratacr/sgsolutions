import {test,expect} from '@playwright/test';
import {detalleEstadisticasCatalogo} from '../src/lib/estadisticas-catalogo';
import {esquemaCatalogo,publicarCatalogo} from '../src/lib/catalogo-modelo';
import base from '../src/lib/catalogo-base.json';
test('agrupa código y enlace sin duplicar categorías y conserva productos retirados',()=>{
 const c=publicarCatalogo(esquemaCatalogo.parse(base)),p=c.productos[0];expect(p).toBeTruthy();
 const resultado=detalleEstadisticasCatalogo(c,[{id:p.id,cantidad:3},{id:p.slug!,cantidad:2},{id:'retirado-del-catalogo',cantidad:4}],'es');
 expect(resultado.productos.find(f=>f.id===p.id)?.cantidad).toBe(5);expect(resultado.categorias.reduce((s,f)=>s+f.cantidad,0)).toBe(5);expect(resultado.sinClasificar).toBe(4);
});
