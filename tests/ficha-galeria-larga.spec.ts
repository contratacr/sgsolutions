import {test,expect,type Page} from '@playwright/test';

// Regresión 2026-11-17: con especificaciones largas (QNAP TS-453E, Ubiquiti UCG-Ultra) la galería se
// centraba contra la columna derecha y la foto quedaba cientos de píxeles abajo, rodeada de vacío.
// Se simula una ficha técnica muy larga en cualquier producto para no depender de los datos del proveedor.
async function abrirFichaLarga(page:Page){
 await page.goto('/tienda');
 await page.locator('.shop-producto h3 a').first().click();
 await expect(page).toHaveURL(/\/tienda\/[^/]+$/);
 await expect(page.locator('.ficha-foto img')).toBeVisible();
 await page.locator('.ficha-compra').evaluate(compra=>{
  const extra=document.createElement('dl');extra.dataset.prueba='larga';
  for(let i=0;i<80;i++){const fila=document.createElement('div');fila.innerHTML=`<dt>Característica ${i}</dt><dd>${'Valor extenso de prueba '.repeat(6)}</dd>`;extra.append(fila);}
  compra.append(extra);
 });
}
const caja=async(page:Page,selector:string)=>(await page.locator(selector).first().boundingBox())!;

test('la foto se queda arriba y visible aunque la ficha técnica sea muy larga',async({page})=>{
 await abrirFichaLarga(page);
 const galeria=await caja(page,'.ficha-galeria'),compra=await caja(page,'.ficha-compra'),foto=await caja(page,'.ficha-foto'),img=await caja(page,'.ficha-foto img');
 expect(compra.height).toBeGreaterThan(galeria.height*3);
 // La imagen nunca crece más que su marco.
 expect(img.height).toBeLessThanOrEqual(foto.height+1);
 expect(img.width).toBeLessThanOrEqual(foto.width+1);
 expect(foto.height).toBeLessThanOrEqual(420);
 if(page.viewportSize()!.width<=700){
  // En una columna la foto va antes que la información.
  expect(galeria.y).toBeLessThan(compra.y);
  return;
 }
 // Columnas lado a lado: la galería empieza a la altura de la información, no a media página.
 expect(Math.abs(galeria.y-compra.y)).toBeLessThan(40);
 // Al bajar por las especificaciones la foto sigue a la vista.
 await page.mouse.wheel(0,1800);
 await expect.poll(async()=>(await page.locator('.ficha-foto').boundingBox())!.y).toBeLessThan(400);
 const tras=await caja(page,'.ficha-foto');
 expect(tras.y).toBeGreaterThanOrEqual(0);
});
