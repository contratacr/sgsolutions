import {test,expect} from '@playwright/test';
import {minimoVentaProducto,cumpleMinimoVenta,aplicarMinimosVenta} from '../src/lib/politica-visibilidad-productos';
import {actualizarOfertasPublicas,type CatalogoPublico} from '../src/lib/catalogo-modelo';
const producto=(nombre:string,precio:number|null,subcategoria='')=>({categoria:'general',subcategoria:{es:subcategoria,en:subcategoria},nombre:{es:nombre,en:nombre},precio});
for(const [nombre,minimo] of [['Mouse Logitech',5000],['AUDÍFONO JBL',10000],['Headset gaming',10000],['Parlante Bluetooth',10000],['Auriculares Sony',10000],['Headphones wireless',10000]] as const){
 test('límites inclusivos '+nombre,()=>{
  expect(cumpleMinimoVenta(producto(nombre,minimo-1))).toBe(false);
  expect(cumpleMinimoVenta(producto(nombre,minimo))).toBe(true);
  expect(cumpleMinimoVenta(producto(nombre,minimo+1))).toBe(true);
 });
}
for(const nombre of ['Mouse pad Logitech','Mousepad RGB','Soporte para parlante','Cable para audífonos','Teclado y mouse','Keyboard and mouse set','Monitor con salida de audífonos','Tablet incluye mouse','Lámpara con parlante'])test('no oculta accesorios ni otros tipos: '+nombre,()=>{
 expect(cumpleMinimoVenta(producto(nombre,1000))).toBe(true);
});
test('clasificación explícita reconoce títulos sin el tipo',()=>{
 expect(cumpleMinimoVenta(producto('Logitech M185',4500,'Mouses'))).toBe(false);
 expect(cumpleMinimoVenta(producto('JBL Tune',9500,'Audífonos'))).toBe(false);
 expect(minimoVentaProducto(producto('Otros',1000,'Mouse pads'))).toBeNull();
});
test('regla independiente del origen y sin modificar catálogo privado',()=>{
 for(const origen of ['manual','eurocomp','intcomex']){
  const p={...producto('Mouse ejemplo',4000),origen,stockManual:9,publicado:true,id:origen};
  const c={productos:[p]};expect(aplicarMinimosVenta(c).productos).toHaveLength(0);
  expect(c.productos).toEqual([p]);expect(p.stockManual).toBe(9);expect(p.publicado).toBe(true);
 }
});
test('no inventa precio de productos que requieren cotización',()=>{expect(cumpleMinimoVenta(producto('Mouse ejemplo',null))).toBe(true);});
test('el precio final de una oferta decide y al vencer puede reaparecer',()=>{
 const ahora=Date.parse('2026-11-09T12:00:00Z');
 const p={...producto('Mouse ejemplo',6000),promocion:{normal:6000,precio:4500,inicio:'2026-11-09T11:00:00Z',fin:'2026-11-09T13:00:00Z'}};
 const c={productos:[p]} as unknown as CatalogoPublico;
 expect(aplicarMinimosVenta(actualizarOfertasPublicas(c,ahora)).productos).toHaveLength(0);
 expect(aplicarMinimosVenta(actualizarOfertasPublicas(c,ahora+7200000)).productos[0].precio).toBe(6000);
 expect(c.productos).toHaveLength(1);
});
