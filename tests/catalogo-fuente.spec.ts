import {test,expect} from '@playwright/test';
import {esquemaCatalogo,publicarCatalogo} from '../src/lib/catalogo-modelo';
import {migrarCatalogoManual,catalogoPublicoManual} from '../src/lib/catalogo-manual';
import {reconciliarEurocomp} from '../src/lib/eurocomp-catalogo';
import inicial from '../src/lib/catalogo-inicial.json';
test('solo Eurocomp: elimina manuales e Intcomex de la tienda, panel y sincronizaciones',()=>{
 const base=esquemaCatalogo.parse(inicial),api=base.productos.find(p=>p.codigoEurocomp&&p.publicado)!;
 api.eurocomp={codigo:api.codigoEurocomp!,stock:15,costo:100,moneda:'USD',actualizado:'2026-10-13T00:00:00Z'};
 const manual={...api,id:'manual-antiguo',eurocomp:undefined,codigoEurocomp:undefined};
 const intcomex={...manual,id:'ic-antiguo',codigoIntcomex:'IC-1'};
 base.productos=[api,manual,intcomex];
 expect(publicarCatalogo(base).productos.map(p=>p.id)).toEqual([api.id]);
 expect(migrarCatalogoManual(base).productos.map(p=>p.id)).toEqual([api.id]);
 const publico=publicarCatalogo(base);publico.productos.push({...publico.productos[0],id:manual.id,codigoEurocomp:undefined});expect(catalogoPublicoManual(publico).productos).toHaveLength(1);
 const copia={fecha:new Date().toISOString(),bodega:0,articulos:[]};const sincronizado=reconciliarEurocomp(base,copia);
 expect(sincronizado.productos.map(p=>p.id)).toEqual([api.id]);expect(publicarCatalogo(sincronizado).productos).toHaveLength(0);
 api.eurocomp!.stock=14;expect(publicarCatalogo(base).productos).toHaveLength(0);
 api.eurocomp!.stock=15;expect(publicarCatalogo(base).productos).toHaveLength(1);
});
