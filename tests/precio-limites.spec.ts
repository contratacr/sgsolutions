import {test,expect} from '@playwright/test';
import {consultarCatalogo, resumenCatalogo} from '../src/lib/catalogo-consulta';
import {publicarCatalogo,esquemaCatalogo} from '../src/lib/catalogo-modelo';
import inicial from '../src/lib/catalogo-inicial.json';
test('el rango real incorpora productos nuevos, elimina extremos retirados y excluye precios pendientes',()=>{
 const c=publicarCatalogo(esquemaCatalogo.parse(inicial));const p=c.productos[0];
 c.productos=[{...p,id:'a',precio:2000},{...p,id:'b',precio:5000},{...p,id:'c',precio:null}];
 const rango=()=>consultarCatalogo(c,new URLSearchParams({min:'3000',max:'4000'})).rangoPrecios;
 expect(rango()).toEqual({minimo:2000,maximo:5000});
 expect(resumenCatalogo(c).precioMinimo).toBe(2000);
 c.productos.push({...p,id:'barato',precio:250},{...p,id:'caro',precio:9000});expect(rango()).toEqual({minimo:250,maximo:9000});
 c.productos=c.productos.filter(p=>!['barato','caro'].includes(p.id));expect(rango()).toEqual({minimo:2000,maximo:5000});
 c.productos=[];expect(rango()).toEqual({minimo:0,maximo:0});
});
for(const idioma of ['es','en'])test(`los límites se refrescan al volver a la pestaña ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);await page.goto('/tienda');
 await expect(page.locator('.shop-orden-trigger')).toBeEnabled();
 const previo=await page.locator('.shop-sidebar input[type=range]').last().getAttribute('max');
 await page.route('**/api/catalogo?*',async route=>{const r=await route.fetch();const d=await r.json();await route.fulfill({json:{...d,rangoPrecios:{minimo:500,maximo:Number(previo)+500000}}});});
 await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 await expect(page.locator('.shop-sidebar input[type=range]').last()).toHaveAttribute('max',String(Number(previo)+500000));
});

test('categoría, subcategoría y marcas acotan el rango antes de aplicar los límites de precio',()=>{
 const c=publicarCatalogo(esquemaCatalogo.parse(inicial)),p=c.productos[0];
 const nombre={es:'Equipo',en:'Equipment'},portatil={es:'Portátiles',en:'Laptops'},mesa={es:'Escritorio',en:'Desktop'};
 c.productos=[{...p,id:'a',nombre,categoria:'computadoras',subcategoria:portatil,marca:'Marca A',precio:2000},{...p,id:'b',nombre,categoria:'computadoras',subcategoria:portatil,marca:'Marca B',precio:5000},{...p,id:'c',nombre,categoria:'computadoras',subcategoria:mesa,marca:'Marca A',precio:9000},{...p,id:'d',nombre,categoria:'redes',marca:'Marca A',precio:100000}];
 const params=new URLSearchParams({categoria:'computadoras'}),rango=()=>consultarCatalogo(c,params).rangoPrecios;
 expect(rango()).toEqual({minimo:2000,maximo:9000});params.set('subcategoria','Portátiles');expect(rango()).toEqual({minimo:2000,maximo:5000});
 params.set('marca','Marca A');expect(rango()).toEqual({minimo:2000,maximo:2000});params.delete('marca');params.append('marcas','Marca A');params.append('marcas','Marca B');expect(rango()).toEqual({minimo:2000,maximo:5000});
 params.set('min','3000');params.set('max','4000');expect(consultarCatalogo(c,params).total).toBe(0);expect(rango()).toEqual({minimo:2000,maximo:5000});
 params.set('marca','Inexistente');params.delete('marcas');expect(rango()).toEqual({minimo:0,maximo:0});
});

for(const idioma of ['es','en'])test(`el rango sigue la selección incluso antes de aplicar el panel móvil ${idioma}`,async({page,context,baseURL,request},info)=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);await page.goto('/tienda');
 if(/movil|mobile/.test(info.project.name))await page.locator('.shop-abrir-filtros').click();
 await page.locator(/movil|mobile/.test(info.project.name)?'.shop-panel-filtros .shop-categoria-empresa>button':'.shop-sidebar .shop-categoria-empresa>button').click();
 const movil=/movil|mobile/.test(info.project.name),panel=page.locator(movil?'.shop-panel-filtros':'.shop-sidebar');
 await panel.locator('.shop-subcategorias button').filter({hasText:idioma==='es'?'Almacenamiento y respaldo':'Storage and backup'}).click();
 const esperado=(await(await request.get('/api/catalogo?categoria=soluciones-empresariales&subcategoria=Almacenamiento%20y%20respaldo')).json()).rangoPrecios;
 const sliders=panel.locator('.shop-precio-rango input');
 await expect(sliders.first()).toHaveAttribute('min',String(esperado.minimo));await expect(sliders.last()).toHaveAttribute('max',String(esperado.maximo));
 await expect(sliders.last()).toBeEnabled();
 await panel.locator('.shop-marcas-opciones label').filter({hasText:'QNAP'}).locator('input').check();
 await expect(sliders.last()).toBeEnabled();await expect(sliders.last()).toHaveAttribute('max',String(esperado.maximo));
 await sliders.last().focus();await sliders.last().press('ArrowLeft');
 const elegido=await sliders.last().inputValue();await expect(sliders.last()).toHaveAttribute('max',String(esperado.maximo));
 if(movil)await panel.locator('.shop-panel-filtros-acciones>.boton').first().click();
 await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy','false');
 const visible=page.locator('.shop-sidebar .shop-precio-rango input').last();await expect(visible).toHaveValue(elegido);
});
