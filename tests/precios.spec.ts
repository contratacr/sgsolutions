import {test,expect} from '@playwright/test';
import {calcularPrecio,colones,publicarCatalogo,esquemaCatalogo,redondearPrecio,politicaPrecios} from '../src/lib/catalogo-modelo';
import base from '../src/lib/catalogo-base.json';
test('fórmula CRC, prioridad manual y costos privados',()=>{
 expect(calcularPrecio(100,politicaPrecios)).toBe(68000);
 expect(calcularPrecio(10,politicaPrecios)).toBe(7000);
 const ajustes={cambio:450,adicional:50,iva:13,utilidad:20};
 expect(calcularPrecio(100,ajustes)).toBe(68000);
 expect(calcularPrecio(36.24,{...ajustes,cambio:455.56})).toBe(25000);
 expect(calcularPrecio(100,ajustes,59900)).toBe(59900);
 expect(calcularPrecio(null,ajustes)).toBeNull();
 expect(redondearPrecio(5999)).toBe(6000);
 expect(redondearPrecio(10987)).toBe(11000);
 expect(redondearPrecio(11000)).toBe(11000);
 expect(redondearPrecio(6001)).toBe(6500);
 expect(redondearPrecio(49750)).toBe(50000);
 expect(redondearPrecio(67800)).toBe(68000);
 expect(redondearPrecio(251000)).toBe(251000);
 expect(colones(68000)).toContain('₡');
 const c=esquemaCatalogo.parse(base);c.productos[0].costoUsd=100;c.productos[1].publicado=false;
 const publico=publicarCatalogo(c);
 expect(publico.productos.some(p=>p.id===c.productos[1].id)).toBe(false);
 for(const producto of publico.productos)for(const campo of ['costoUsd','costoCrc','precioManual','precioDescuento','utilidad','cambio'])expect(producto).not.toHaveProperty(campo);
 expect(publico).not.toHaveProperty('ajustes');
 c.productos[0].revisionPrecio=true;c.productos[0].precioManual=null;
 expect(publicarCatalogo(c).productos.find(p=>p.id===c.productos[0].id)?.precio).toBeNull();
 expect(esquemaCatalogo.safeParse({...c,ajustes:{...ajustes,cambio:-1}}).success).toBe(false);
 expect(esquemaCatalogo.safeParse({...c,categorias:[]}).success).toBe(false);
 expect(esquemaCatalogo.safeParse({...c,productos:[{...c.productos[0],imagen:'javascript:alert(1)'}]}).success).toBe(false);
});
test('ejemplo del Excel: costo USD 13,90, recargo del 20%, IVA y ajuste comercial',()=>{
 // Copia de Calculos (004)v.xlsx, D5 = B5*500*1.13*1.2; G5 es manual.
 expect(13.9*500*1.13*1.2).toBeCloseTo(9424.20,2);
 expect(calcularPrecio(13.9,politicaPrecios)).toBe(9500);
 expect(calcularPrecio(null,politicaPrecios,null,6950)).toBe(9500);
 expect(calcularPrecio(13.9,politicaPrecios,9500)).toBe(9500);
 // I5 = ROUNDUP(G5/(0.9*1.13),2): cálculo inverso independiente del precio público.
 expect(Math.ceil(9500/(0.9*1.13)*100)/100).toBe(9341.20);
 for(const [entrada,salida] of [[500,500],[500.01,1000],[9424.20,9500],[9500,9500],[49500.01,50000],[50000,50000],[50000.01,51000]])expect(redondearPrecio(entrada)).toBe(salida);
 expect(redondearPrecio(500.00000000000006)).toBe(500);
});
test('tienda mantiene CRC en inglés y ordena precios',async({page,context},prueba)=>{
 await context.addCookies([{name:'sg-idioma',value:'en',domain:'127.0.0.1',path:'/'}]);
 await page.goto('/tienda');
 await expect(page.locator('html')).toHaveAttribute('lang','en');
 await expect(page.locator('.shop-orden select')).toBeEnabled();
 await page.locator('.shop-orden select').selectOption('menor');
 await expect.poll(()=>page.getByRole('article').count()).toBeGreaterThan(1);
 const precios=await page.locator('.shop-precio strong').allTextContents();
 const valores=precios.map(precio=>Number(precio.replace(/\D/g,'')));
 expect(valores.length).toBeGreaterThan(1);
 expect(valores).toEqual([...valores].sort((a,b)=>a-b));
 for(const p of await page.locator('.shop-precio strong').all())await expect(p).toContainText('₡');
 for(const img of await page.locator('.shop-foto img').all()){await img.scrollIntoViewIfNeeded();await expect.poll(()=>img.evaluate((e:HTMLImageElement)=>e.complete&&e.naturalWidth>0)).toBe(true);}
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:`evidencias/tienda-en-${prueba.project.name}.png`,fullPage:true,animations:'disabled',scale:'css'});
 await page.getByRole('article').first().getByRole('button',{name:'Add to cart',exact:true}).click();
 await page.getByRole('button',{name:'Open cart'}).click();
 await expect(page.locator('.carrito-resumen')).toContainText('₡');
 await page.goto('/panel/catalogo');await expect(page).toHaveURL(/\/admin/);
});

test('colones conserva separadores y redondeo idénticos en servidor y navegador',()=>{
 expect(colones(0)).toBe('₡0');
 expect(colones(619000)).toBe('₡619\u00a0000');
 expect(colones(1234567)).toBe('₡1\u00a0234\u00a0567');
 expect(colones(1234.6)).toBe('₡1\u00a0235');
});
