import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import es from '../messages/es.json';
import en from '../messages/en.json';
import {createHash,randomBytes} from 'node:crypto';

test.describe.configure({mode:'serial'});
for(const idioma of ['es','en'])test(`buscador sin doble foco y cargas centradas ${idioma}`,async({page,context})=>{
 test.skip(process.env.SG_TEST_ALTAS!=='1','Requiere sesión local aislada');
 const archivo='.privado/admin-local/cuenta.json',original=await readFile(archivo,'utf8');
 const cuenta=JSON.parse(original),token=randomBytes(32).toString('hex');
 cuenta.sesiones.push({hash:createHash('sha256').update(token).digest('hex'),vence:Date.now()+120000});
 try{
  await writeFile(archivo,JSON.stringify(cuenta));
  await context.addCookies([{name:'sg-admin-local',value:token,domain:'127.0.0.1',path:'/'},{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
  await page.goto('/panel/pedidos');await page.locator('.panel-nueva-asesoria>summary').click();
  const buscador=page.locator('.panel-nueva-asesoria .panel-buscador input');
  await buscador.click();await buscador.fill('mouse');await buscador.press('ArrowLeft');
  await expect(page.locator('html')).toHaveAttribute('data-interaccion','teclado');
  const foco=await buscador.evaluate(e=>({interior:getComputedStyle(e).outlineStyle,exterior:getComputedStyle(e.parentElement!).outlineStyle}));
  expect(foco).toEqual({interior:'none',exterior:'solid'});
  await page.screenshot({path:`/tmp/sg-panel-buscador-${idioma}-${test.info().project.name}.png`});
  for(const ruta of ['/panel','/panel/catalogo','/panel/contenido','/panel/pedidos','/panel/estadisticas']){
   // Exercise the actual streamed fallback HTML emitted by Next, rather than a copied fixture.
   const respuesta=await page.request.get(ruta);expect(respuesta.ok()).toBe(true);
   const html=await respuesta.text();const carga=html.match(/<main\b[^>]*class="estado-pagina"[^>]*>[\s\S]*?<\/main>/)?.[0];
   // Fast responses can finish without emitting a Suspense fallback.
   if(!carga)continue;
   await page.evaluate(fragmento=>{document.querySelector('.panel-diseno>main')!.outerHTML=fragmento!;},carga);
   await expect(page.locator('.estado-panel')).toContainText((idioma==='es'?es:en).Error.cargando);
   const posicion=await page.locator('.estado-panel').evaluate(e=>{const p=e.getBoundingClientRect(),m=e.closest('main')!.getBoundingClientRect();return {horizontal:Math.abs(p.x+p.width/2-innerWidth/2),vertical:Math.abs(p.y+p.height/2-(m.y+m.height/2))};});
   expect(posicion.horizontal).toBeLessThan(2);expect(posicion.vertical).toBeLessThan(2);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:`/tmp/sg-panel-carga-${idioma}-${test.info().project.name}.png`});
 }finally{await writeFile(archivo,original);}
});
