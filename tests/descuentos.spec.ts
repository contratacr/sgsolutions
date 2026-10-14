import {test,expect} from '@playwright/test';
import {aplicarDescuento,descuentosInvalidos,esquemaCatalogo,publicarCatalogo} from '../src/lib/catalogo-modelo';
import {reconciliarEurocomp} from '../src/lib/eurocomp-catalogo';
import inicial from '../src/lib/catalogo-base.json';
test('publica únicamente la oferta activa como precio a cobrar',()=>{
 const c=esquemaCatalogo.parse(inicial);const p=c.productos[0];p.precioManual=2500;p.precioDescuento=1500;p.publicado=true;p.revisionPrecio=false;if(p.eurocomp)p.eurocomp.stock=50;
 const visible=publicarCatalogo(c).productos.find(x=>x.id===p.id)!;expect(visible.precio).toBe(1500);expect(visible.precioOriginal).toBe(2500);expect(descuentosInvalidos(c)).toEqual([]);
 p.precioDescuento=null;expect(publicarCatalogo(c).productos.find(x=>x.id===p.id)!.precio).toBe(2500);expect(publicarCatalogo(c).productos.find(x=>x.id===p.id)!.precioOriginal).toBeNull();
});
test('rechaza ofertas inválidas al guardar y no aplica ofertas mayores tras cambiar el precio normal',()=>{
 for(const precio of [-1,0,1500.5])expect(esquemaCatalogo.safeParse({...inicial,productos:[{...inicial.productos[0],precioDescuento:precio}]}).success).toBe(false);
 expect(aplicarDescuento(2500,2500)).toEqual({precio:2500,precioOriginal:null});expect(aplicarDescuento(null,1500)).toEqual({precio:null,precioOriginal:null});
 const c=esquemaCatalogo.parse(inicial);c.productos[0].precioManual=1000;c.productos[0].precioDescuento=1500;expect(descuentosInvalidos(c)).toContain(0);expect(publicarCatalogo(c).productos.find(p=>p.id===c.productos[0].id)?.precio).toBe(1000);
});

test('la sincronización conserva la oferta y desactiva una oferta que ya no reduce el precio',()=>{
 const c=esquemaCatalogo.parse(inicial);const p=c.productos[0];c.productos=[p];p.precioDescuento=1500;
 const articulo={codigo:p.codigoEurocomp!,parte:'DEMO',nombre:'Original',marca:'Demo',familia:'Tarjetas de Red',familiaPadre:'COMPONENTES DE PC',imagen:p.imagen,precio:10,moneda:'USD',stock:50};
 const actualizado=reconciliarEurocomp(c,{fecha:new Date().toISOString(),bodega:0,articulos:[articulo]});expect(actualizado.productos[0].precioDescuento).toBe(1500);expect(publicarCatalogo(actualizado).productos[0].precio).toBe(1500);
 const masBarato=reconciliarEurocomp(actualizado,{fecha:new Date().toISOString(),bodega:0,articulos:[{...articulo,precio:1}]});expect(publicarCatalogo(masBarato).productos[0].precioOriginal).toBeNull();expect(publicarCatalogo(masBarato).productos[0].precio).toBeLessThan(1500);
});
