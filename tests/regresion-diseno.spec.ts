import {test,expect} from '@playwright/test';
import es from '../messages/es.json';
import en from '../messages/en.json';
import {llegarAPago} from './ayudas/compra';
for(const idioma of ['es','en'] as const){
 test(`Compra conserva la simplificación, alineación y datos ${idioma}`,async({page,context,baseURL})=>{
  await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
  await page.goto('/tienda');await page.locator('#buscar-equipo').fill('conector');await expect(page.locator('.shop-producto button.producto-agregar').first()).toBeVisible();await expect(page.locator('.shop-orden-trigger')).toBeEnabled();await page.locator('.shop-producto button').first().click();await page.goto('/pagar');
  await expect(page.locator('.campo-telefono')).toHaveCount(1);
  await expect(page.locator('.compra-acceso a')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveClass(/sr-only/);
  await expect(page.locator('.compra-pasos button')).toHaveCount(3);
  const t=(idioma==='es'?es:en).Compra;
  await page.locator('input[name=modalidad][value=envio]').check();
  const receptor=page.getByRole('checkbox',{name:t.otro,exact:true});
  await expect(receptor).toBeVisible();
  const distancia=await receptor.evaluate(input=>{
   const label=input.closest('label')!;
   const texto=[...label.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent?.trim())!;
   const rango=document.createRange();rango.selectNodeContents(texto);
   return Math.abs(input.getBoundingClientRect().top-rango.getBoundingClientRect().top);
  });
  expect(distancia).toBeLessThan(12);
  await llegarAPago(page,idioma);
  const atras=page.getByRole('button',{name:t.pasoAtras,exact:true});
  const revisar=page.locator('.compra-acciones-finales button[type=submit]');
  const a=await atras.boundingBox(),r=await revisar.boundingBox();
  expect(a!.x+a!.width).toBeLessThanOrEqual(r!.x);
  expect(Math.abs(a!.y-r!.y)).toBeLessThan(2);
  await atras.click();
  const siguiente=page.getByRole('button',{name:t.pasoSiguiente,exact:true});
  const b=await atras.boundingBox(),s=await siguiente.boundingBox();
  expect(s!.x-(b!.x+b!.width)).toBeLessThanOrEqual(20);
  await atras.click();await expect(page.locator('[name=nombre]')).toHaveValue('Cliente');
  await expect(page.locator('html')).toHaveAttribute('lang',idioma);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const favicon=page.locator('link[rel=icon]').first();await expect(favicon).toHaveAttribute('href',/icon/);
 });
 test(`Búsqueda de pedidos sin doble borde y detalle organizado ${idioma}`,async({page,context,baseURL})=>{
  await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);await page.goto('/vista-previa/pedidos');
  const buscar=page.locator('.propuesta-buscar input');await buscar.fill('Diego');
  await expect(buscar).toHaveCSS('outline-style','none');
  await page.locator('.propuesta-pedido summary').first().click();
  const detalle=page.locator('.propuesta-pedido details[open] .propuesta-detalle');
  await expect(detalle.locator('.propuesta-detalle-productos')).toBeVisible();
  await expect(detalle.locator('.propuesta-detalle-contacto')).toBeVisible();
  await expect(detalle.locator('.propuesta-detalle-entrega')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 });
}
