import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
for(const idioma of ['es','en'])test(`panel conserva estilos desde el primer frame ${idioma}`,async({context,baseURL})=>{
 const {token}=JSON.parse(await readFile('.privado/contenido-pruebas/sesion.json','utf8'));
 await context.addCookies([{name:'sg-admin-local',value:token,url:baseURL!},{name:'sg-idioma',value:idioma,url:baseURL!}]);
 for(const ruta of ['/panel','/panel/catalogo','/panel/proveedores','/panel/contenido','/panel/pedidos','/panel/usuarios','/panel/estadisticas']){
  const page=await context.newPage();
  await page.route(/\.css(?:\?|$)/,async route=>{await new Promise(resolve=>setTimeout(resolve,250));await route.continue();});
  await page.addInitScript(()=>{
   const frames:{ruta:string;estilos:boolean}[]=[];Object.assign(window,{__panelFrames:frames});
   function mirar(){const header=document.querySelector('.pedidos-reales-nav');if(header&&header.getBoundingClientRect().height>0){const s=getComputedStyle(header);if(frames.length<1000)frames.push({ruta:location.pathname,estilos:s.display==='flex'&&s.backgroundColor==='rgb(11, 36, 50)'&&[['.pedidos-reales-bandeja','borderTopWidth','1px'],['.usuarios-lista','display','grid'],['.estadisticas-cabecera','display','flex']].every(([selector,propiedad,valor])=>{const elemento=document.querySelector(selector);return !elemento||getComputedStyle(elemento).getPropertyValue(propiedad.replace(/[A-Z]/g,l=>'-'+l.toLowerCase()))===valor;})});}requestAnimationFrame(mirar);}requestAnimationFrame(mirar);
  });
  await page.goto(ruta);await expect(page.locator('.pedidos-reales-nav a[aria-current=page]')).toHaveAttribute('href',ruta);
  await expect(page.locator('.pedidos-reales-nav')).toHaveCSS('display','flex');
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  const frames=await page.evaluate(()=>(window as unknown as {__panelFrames:{ruta:string;estilos:boolean}[]}).__panelFrames);
  expect(frames.length,ruta).toBeGreaterThan(0);expect(frames.filter(f=>!f.estilos),ruta).toEqual([]);
  await expect(page.locator('html')).toHaveAttribute('lang',idioma);
  // Repeat a real client transition with the shared header kept mounted.
  const siguiente=ruta==='/panel/pedidos'?'/panel/usuarios':'/panel/pedidos';
  await page.locator(`.pedidos-reales-nav a[href="${siguiente}"]`).click();await expect(page).toHaveURL(new RegExp(siguiente+'$'));
  await expect(page.locator('.pedidos-reales-nav a[aria-current=page]')).toHaveAttribute('href',siguiente);
  const posteriores=await page.evaluate(()=>(window as unknown as {__panelFrames:{ruta:string;estilos:boolean}[]}).__panelFrames);
  expect(posteriores.filter(f=>!f.estilos),ruta+' → '+siguiente).toEqual([]);
  await page.close();
 }
});
