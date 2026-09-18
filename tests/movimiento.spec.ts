import {test,expect} from '@playwright/test';

test('las fotografías aparecen al desplazarse una sola vez y respetan movimiento reducido',async({page})=>{
 await page.addInitScript(()=>{
  const original=Element.prototype.animate;
  Element.prototype.animate=function(...args:Parameters<Element['animate']>){
   if(this.matches('.historia-foto'))this.setAttribute('data-entradas',String(Number(this.getAttribute('data-entradas')||0)+1));
   return original.apply(this,args);
  };
 });
 await page.goto('/casos-de-exito');
 await expect(page.locator('.historia-foto[data-entradas]')).toHaveCount(0);
 const foto=page.locator('.historia-foto').last();
 await foto.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
 await expect(foto).toHaveAttribute('data-entradas','1');
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
 await foto.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
 await expect(foto).toHaveAttribute('data-entradas','1');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.reload();
 await foto.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
 await expect(foto).toBeVisible();
 await expect(foto).not.toHaveAttribute('data-entradas');
});

test('soporte prepara el contenido fuera de pantalla y lo revela al entrar',async({page})=>{
 await page.goto('/soporte');
 const bloque=page.locator('.servicio-grupo[data-revelar-pendiente]').last();
 await expect(bloque).toHaveCSS('opacity','0');
 const indice=await bloque.evaluate(el=>Array.from(document.querySelectorAll('.servicio-grupo')).indexOf(el));
 const destino=page.locator('.servicio-grupo').nth(indice);
 await destino.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
 await expect(destino).not.toHaveAttribute('data-revelar-pendiente');
 await expect(destino).toHaveCSS('opacity','1');
 await page.evaluate(()=>scrollTo(0,0));
 await destino.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
 await expect(destino).toHaveCSS('opacity','1');
});

test('la navegación interna conserva apariciones en Empresas y Soporte',async({page})=>{
 await page.goto('/');
 await page.locator('main a[href="/empresas"]').first().click();
 await expect(page).toHaveURL(/empresas/);
 const planes=page.locator('.servicio');
 await expect(planes.last()).toHaveAttribute('data-revelar-pendiente','');
 await planes.last().evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
 await expect(planes.last()).not.toHaveAttribute('data-revelar-pendiente');
 await expect(planes.last()).toHaveCSS('opacity','1');
});

test('los iconos empresariales están centrados en sus contenedores',async({page})=>{
 await page.goto('/empresas');
 const diferencias=await page.locator('.servicio-icono').evaluateAll(iconos=>iconos.map(contenedor=>{
  const caja=contenedor.getBoundingClientRect();
  const svg=contenedor.querySelector('svg')!.getBoundingClientRect();
  return {x:Math.abs((caja.left+caja.width/2)-(svg.left+svg.width/2)),y:Math.abs((caja.top+caja.height/2)-(svg.top+svg.height/2))};
 }));
 for(const diferencia of diferencias){expect(diferencia.x).toBeLessThanOrEqual(1);expect(diferencia.y).toBeLessThanOrEqual(1);}
});
