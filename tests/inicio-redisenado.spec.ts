import {test, expect} from '@playwright/test';

for (const idioma of ['es', 'en'] as const) {
  test(`inicio integrado y rutas en ${idioma}`, async ({page, context}, info) => {
    await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang',idioma);
    await expect(page.getByRole('heading',{level:1})).toHaveText(idioma==='es'?'¿Qué necesita hoy?':'What do you need today?');
    await expect(page.locator('.inicio-camino')).toHaveCount(3);
    for(const foto of await page.locator('.inicio-camino>img').all()){await expect(foto).toHaveAttribute('loading','eager');await expect(foto).toHaveAttribute('fetchpriority','high');}
    await expect(page.locator('.inicio-triptico-paneles')).toBeVisible();
    if (info.project.name === 'escritorio') {
      const paneles=page.locator('.inicio-triptico-panel');
      expect(await paneles.evaluateAll(es=>Math.max(...es.map(e=>e.clientWidth))-Math.min(...es.map(e=>e.clientWidth)))).toBeLessThanOrEqual(1);
      await paneles.nth(1).hover();
      await expect.poll(()=>paneles.evaluateAll(es=>es[1].clientWidth-es[0].clientWidth)).toBeGreaterThan(20);
      await page.mouse.move(1,1);
      await expect.poll(()=>paneles.evaluateAll(es=>Math.max(...es.map(e=>e.clientWidth))-Math.min(...es.map(e=>e.clientWidth)))).toBeLessThanOrEqual(1);
    }
    await expect(page.locator('.inicio-caso,.inicio-cierre')).toHaveCount(0);
    if (info.project.name === 'escritorio') {
      for (const [width,height] of [[1440,900],[1366,768],[1024,768]]) {
        await page.setViewportSize({width,height});
        await expect.poll(async()=>page.locator('.pie').evaluate(e=>Math.ceil(e.getBoundingClientRect().bottom))).toBeLessThanOrEqual(height+1);
        expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(height+1);
      }
    } else {
      await expect.poll(async()=>page.locator('.inicio-triptico').evaluate(e=>Math.round(e.getBoundingClientRect().bottom))).toBeGreaterThanOrEqual(page.viewportSize()!.height);
    }
    await page.goto('/casos-de-exito');
    await expect(page.locator('.historias .caso').first()).toBeVisible();
    await page.goto('/contacto');
    await expect(page.locator('.contacto-pagina .area-descripcion')).toContainText(idioma==='es'?'la solución adecuada':'the right equipment or solution');
    await page.goto('/');
    for (const ruta of ['/tienda','/soporte','/empresas']) {
      const enlace=page.locator(`.inicio-camino[href="${ruta}"]`);
      await expect(enlace).toBeVisible();
      await expect(enlace).not.toHaveAttribute('target','_blank');
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    expect(await page.locator('main img').evaluateAll(imagenes=>imagenes.filter(i=>(i as HTMLImageElement).complete&&(i as HTMLImageElement).naturalWidth===0).length)).toBe(0);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang',idioma);
    await page.screenshot({path:`.privado/inicio-imagenes/${info.project.name}-${idioma}.png`,fullPage:true});
  });
}

test('los paneles no cambian de tamaño al pasar el cursor en ancho móvil', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  const paneles = page.locator('.inicio-triptico-panel');
  const alturas = await paneles.evaluateAll(elementos => elementos.map(elemento => Math.round(elemento.getBoundingClientRect().height)));
  for (let indice = 0; indice < 3; indice++) {
    await paneles.nth(indice).hover();
    await page.waitForTimeout(200);
    expect(await paneles.evaluateAll(elementos => elementos.map(elemento => Math.round(elemento.getBoundingClientRect().height)))).toEqual(alturas);
  }
});

test('presión sin saltos y navegación directa con movimiento reducido',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 const panel=page.locator('.inicio-camino-soporte');
 const imagen=panel.locator('img');
 const alturas=await page.locator('.inicio-triptico-panel').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));
 await panel.hover();
 await expect.poll(()=>imagen.evaluate(e=>getComputedStyle(e).transform)).toBe('none');
 await page.mouse.down();
 await expect(imagen).toHaveCSS('transform','none');
 await expect(panel.locator('.inicio-triptico-sombra')).toHaveCSS('opacity','0.85');
 await expect(panel).toHaveCSS('touch-action','manipulation');
 expect(await page.locator('.inicio-triptico-panel').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height))).toEqual(alturas);
 // Cancelar el toque al salir: no navegar ni dejar un hover permanente.
 await page.mouse.move(2,2);
 await page.mouse.up();
 await expect.poll(()=>imagen.evaluate(e=>getComputedStyle(e).transform)).toBe('none');
 await expect(page).toHaveURL(/\/$/);
 await page.emulateMedia({reducedMotion:'reduce'});
 await panel.hover();await page.mouse.down();
 await expect(imagen).toHaveCSS('transform','none');
 await page.mouse.up();
 await expect(page).toHaveURL(/\/soporte$/);
});

for(const idioma of ['es','en'])test(`Tres destinos iguales y toque con transición antes de navegar ${idioma}`,async({page,context})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 const paneles=page.locator('.inicio-triptico-panel');
 const alturas=await paneles.evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));
 expect(Math.abs(alturas[2]-alturas[0])).toBeLessThanOrEqual(1);
 expect(Math.abs(alturas[2]-alturas[1])).toBeLessThanOrEqual(1);
 const empresa=paneles.nth(2);await expect(empresa.locator('strong')).toContainText(idioma==='es'?'Empresas':'Business');
 // Mantener la siguiente respuesta pendiente para inspeccionar el efecto previo a la navegación.
 let liberar!:()=>void;const espera=new Promise<void>(r=>liberar=r);
 await page.route('**/soporte*',async ruta=>{await espera;await ruta.continue();});
 const soporte=paneles.nth(1);if(test.info().project.use.hasTouch)await soporte.tap();else await soporte.click();
 await expect(soporte).toHaveAttribute('data-navegando','true');
 await expect(soporte.locator('.inicio-toque-flecha')).toBeVisible();
 await expect.poll(()=>soporte.locator('img').evaluate(e=>getComputedStyle(e).transform)).not.toBe('none');
 await expect.poll(()=>paneles.nth(0).evaluate(e=>Number(getComputedStyle(e).opacity))).toBeLessThan(.85);
 await expect.poll(()=>soporte.locator('img').evaluate(e=>new DOMMatrixReadOnly(getComputedStyle(e).transform).a)).toBeGreaterThan(1.24);
 expect(await paneles.evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height))).toEqual(alturas);
 liberar();await expect(page).toHaveURL(/\/soporte$/);
 await page.goBack();await expect(page).toHaveURL(/\/$/);
 await expect(page.locator('[data-navegando=true]')).toHaveCount(0);
});
