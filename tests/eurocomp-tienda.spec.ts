import {test,expect} from '@playwright/test';
import {categoriaEurocomp,stockVendibleEurocomp,precioVentaEurocomp} from '../src/lib/eurocomp-politica';
import {publicarCatalogo,esquemaCatalogo,calcularPrecio} from '../src/lib/catalogo-modelo';
import base from '../src/lib/catalogo-base.json';
test('mínimo de 15, categorías tecnológicas y precio final con IVA',()=>{
 expect(stockVendibleEurocomp(14)).toBe(false);expect(stockVendibleEurocomp(15)).toBe(true);expect(stockVendibleEurocomp(15,16)).toBe(false);
 expect(categoriaEurocomp({familiaPadre:'ELECTRODOMESTICOS',familia:'PLANCHAS'})).toBeNull();
 expect(categoriaEurocomp({familiaPadre:'COMPONENTES DE PC',familia:'ABANICOS'})).toBe('componentes');
 expect(categoriaEurocomp({familiaPadre:'ACCESORIOS',familia:'Adaptadores',nombre:'ADAPTADOR DE RED TP LINK PCI-E ETHERNET'})).toBe('redes');
 expect(categoriaEurocomp({familiaPadre:'ACCESORIOS',familia:'Cargadores',nombre:'CARGADOR INALAMBRICO 15W'})).toBe('accesorios');
 expect(categoriaEurocomp({familiaPadre:'ACCESORIOS',familia:'Hubs',nombre:'HUB USB 6 EN 1 CON ETHERNET'})).toBe('accesorios');
 expect(precioVentaEurocomp(100,'USD',500,20)).toBe(68000);
 const privado=esquemaCatalogo.parse(base);const p=privado.productos[0];p.eurocomp={codigo:'DEMO',stock:14,costo:123.45,moneda:'USD',actualizado:new Date().toISOString()};
 expect(publicarCatalogo(privado).productos.find(x=>x.id===p.id)).toBeUndefined();p.eurocomp.stock=15;const visible=publicarCatalogo(privado).productos.find(x=>x.id===p.id)!;expect(visible.codigoEurocomp).toBe('DEMO');expect(JSON.stringify(visible)).not.toContain('123.45');expect(visible).not.toHaveProperty('eurocomp');
 const publico=publicarCatalogo(esquemaCatalogo.parse(base));expect(publico.productos.length).toBe(1469);expect(JSON.stringify(publico)).not.toContain('costo');
});
for(const idioma of ['es','en'])test(`tienda, cantidad y carrito en ${idioma}`,async({page})=>{
 await page.context().addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 await page.goto('/tienda');await expect(page.locator('.shop-producto').first()).toBeVisible();
 await expect(page.locator('.shop-producto').first().locator('a[href*="wa.me"]')).toHaveCount(0);
 await expect(page.locator('.shop-producto').first().locator('.contador-cantidad')).toHaveCount(0);
 await page.locator('.shop-producto').first().getByRole('button',{name:idioma==='es'?'Agregar al carrito':'Add to cart',exact:true}).click();
 await expect(page.getByText(idioma==='es'?'Ver carrito':'View cart',{exact:true}).first()).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('.carrito-confirmacion').getByRole('button',{name:idioma==='es'?'Ver carrito':'View cart',exact:true}).click();
 const contador=page.locator('.carrito-panel .contador-cantidad input');await expect(contador).toHaveValue('1');await contador.fill('3');await expect(contador).toHaveValue('3');
 await page.locator('.carrito-cabecera button').click();
 await page.locator('.shop-producto h3 a').first().click();const ficha=page.locator('.ficha-cantidad input');await expect(ficha).toHaveValue('1');await ficha.fill('2');await page.locator('.ficha-agregar').click();
 await page.locator('.carrito-confirmacion').getByRole('button',{name:idioma==='es'?'Ver carrito':'View cart',exact:true}).click();await expect(contador).toHaveValue('5');await page.locator('.carrito-cabecera button').click();
 await page.goto('/finalizar-compra');await expect(page.locator('form input[name=nombre]')).toBeVisible();
 await expect(page.locator('.compra-asesoria-obligatoria')).toHaveCount(0);
 await page.reload();await expect(page.locator('html')).toHaveAttribute('lang',idioma);
 await page.goto('/soluciones');await expect(page).toHaveURL(/\/tienda$/);
});

test('la actualización retira stock bajo y recupera stock elegible sin cambiar textos editados',async()=>{
 const {reconciliarEurocomp}=await import('../src/lib/eurocomp-catalogo');
 const inicial=esquemaCatalogo.parse(base);const producto=inicial.productos[0];inicial.productos=[producto];producto.nombre.es='Nombre editado';
 const articulo={codigo:producto.codigoEurocomp!,parte:'DEMO',nombre:'Original',marca:'Demo',familia:'Tarjetas de Red',familiaPadre:'COMPONENTES DE PC',imagen:producto.imagen,precio:100,moneda:'USD',stock:14};
 const bajo=reconciliarEurocomp(inicial,{fecha:new Date().toISOString(),bodega:0,articulos:[articulo]});expect(publicarCatalogo(bajo).productos).toHaveLength(0);
 const repuesto=reconciliarEurocomp(bajo,{fecha:new Date().toISOString(),bodega:0,articulos:[{...articulo,stock:15}]});expect(publicarCatalogo(repuesto).productos).toHaveLength(1);expect(repuesto.productos[0].nombre.es).toBe('Nombre editado');
});

test('Eurocomp respeta la misma fórmula histórica, incluido adicional cambiario e IVA configurable',()=>{
 const ajustes={cambio:500,adicional:15,iva:13,utilidad:20};
 for(const costo of [9.56,100,799.99]){expect(precioVentaEurocomp(costo,'USD',ajustes.cambio,ajustes.utilidad,ajustes.iva,ajustes.adicional)).toBe(calcularPrecio(costo,ajustes));expect(precioVentaEurocomp(costo,'CRC',ajustes.cambio,ajustes.utilidad,ajustes.iva,ajustes.adicional)).toBe(calcularPrecio(null,ajustes,null,costo));}
});

test('la actualización elimina productos manuales y sus categorías vacías',async()=>{
 const {reconciliarEurocomp}=await import('../src/lib/eurocomp-catalogo');
 const inicial=esquemaCatalogo.parse(base),manual={...inicial.productos[0],id:'manual-existente',categoria:'categoria-manual',codigoEurocomp:undefined,eurocomp:undefined};
 inicial.categorias.push({id:'categoria-manual',nombre:{es:'Categoría manual',en:'Manual category'}});inicial.productos=[manual];
 const result=reconciliarEurocomp(inicial,{fecha:new Date().toISOString(),bodega:0,articulos:[]});
 expect(esquemaCatalogo.safeParse(result).success).toBe(true);expect(result.categorias.some(c=>c.id==='categoria-manual')).toBe(false);expect(result.productos).toHaveLength(0);
});
