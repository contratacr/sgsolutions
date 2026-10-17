import {test,expect} from '@playwright/test';
import {readFile,mkdir} from 'node:fs/promises';
import es from '../messages/es.json';import en from '../messages/en.json';
for(const idioma of ['es','en'] as const)test(`bandeja real unificada, filtros y presentación ${idioma}`,async({page,context,request},info)=>{
 await request.get('http://127.0.0.1:3135/reset');
 const {token}=JSON.parse(await readFile('.privado/contenido-pruebas/sesion.json','utf8'));
 await context.addCookies([{name:'sg-admin-local',value:token,domain:'127.0.0.1',path:'/'},{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 const t=(idioma==='es'?es:en).PropuestaPedidos;
 const errores:string[]=[];page.on('pageerror',e=>errores.push(e.message));
 await page.goto('/panel/pedidos');
 const bandeja=page.locator('.pedidos-reales-bandeja:visible'),rows=bandeja.locator('.pedidos-admin-tarjeta');
 await expect(bandeja.getByLabel(t.buscar,{exact:true})).toBeEnabled();
 await expect(rows).toHaveCount(3);
 const resumen=rows.first().locator('.panel-pedido-detalle>summary');
 await expect.poll(()=>resumen.evaluate(el=>{const estilo=getComputedStyle(el,'::after'),r=el.getBoundingClientRect();return estilo.content===String.fromCharCode(34)+'+'+String.fromCharCode(34)&&r.right<=innerWidth;})).toBe(true);
 const estadoPago=(idioma==='es'?es:en).PanelLista.estadoPago;
 await expect(bandeja.locator('.pedidos-reales-filtros').getByRole('button',{name:estadoPago,exact:true})).toBeVisible();
 await expect(bandeja.locator('.pedidos-reales-resultados').getByRole('button',{name:estadoPago,exact:true})).toHaveCount(0);
 if(info.project.name==='safari-mobile'){
  const barra=bandeja.locator('.pedidos-reales-vistas');
  await expect.poll(()=>etapasVisibles(barra)).toBe(true);
  const original=page.viewportSize()!;await page.setViewportSize({width:320,height:original.height});
  expect(await barra.evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true);
  await expect.poll(()=>etapasVisibles(barra)).toBe(true);await page.setViewportSize(original);
 }
 const etapas=bandeja.locator('.pedidos-reales-vistas');const contadores=await etapas.textContent();
 await bandeja.getByLabel(t.buscar,{exact:true}).fill('envio QA');await expect(rows).toHaveCount(1);await expect(rows).toContainText('Envío QA');expect(await etapas.textContent()).toBe(contadores);
 await bandeja.getByRole('button',{name:t.limpiar,exact:true}).click();await expect(rows).toHaveCount(3);
 await bandeja.getByLabel(t.formaPago,{exact:true}).click();await page.locator('[data-valor=sinpe]').click();await expect(rows).toHaveCount(1);await expect(rows).toContainText('Retiro QA');
 await bandeja.getByRole('button',{name:t.limpiar,exact:true}).click();
 await bandeja.getByLabel(t.entrega,{exact:true}).click();await page.locator('[data-valor=envio]').click();await expect(rows).toHaveCount(1);await expect(rows).toContainText('Envío QA');
 await bandeja.getByRole('button',{name:t.limpiar,exact:true}).click();
 await bandeja.getByLabel(t.ordenFecha,{exact:true}).click();await page.locator('[data-valor=recientes]').click();await expect(bandeja.getByLabel(t.ordenFecha,{exact:true})).toContainText(t.recientes);
 await rows.filter({hasText:'Retiro QA'}).locator('.panel-pedido-detalle>summary').click();
 const abierto=rows.filter({hasText:'Retiro QA'});await expect(abierto.locator('.panel-contacto-cliente')).toBeVisible();await expect(abierto.locator('.pedido-real-productos')).toBeVisible();await expect(abierto.locator('.pedido-gestion-entrega')).toBeVisible();for(const dato of ['cliente@example.test','Persona autorizada QA','123456789','Empresa QA','factura@example.test','Dirección fiscal QA','Llamar antes de entregar'])await expect(abierto).toContainText(dato);await expect(abierto.locator('a[href*="wa.me"]')).toHaveAttribute('target','_blank');
 await expect(page.locator('.pedidos-reales-nav a[aria-current=page]')).toHaveAttribute('href','/panel/pedidos');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await expect(page.locator('html')).toHaveAttribute('lang',idioma);
 await mkdir('.privado/pedidos-reales',{recursive:true});await page.screenshot({path:`.privado/pedidos-reales/${info.project.name}-${idioma}.png`,fullPage:true});await page.screenshot({path:`.privado/pedidos-reales/header-${info.project.name}-${idioma}.png`});expect(errores).toEqual([]);
});

async function etapasVisibles(barra:import('@playwright/test').Locator){return barra.evaluate(el=>{const r=el.getBoundingClientRect(),botones=[...el.children].map(h=>h.getBoundingClientRect());const ok=getComputedStyle(el).scrollbarWidth==='none'&&(el.scrollWidth<=el.clientWidth+1||botones.some(b=>b.left<r.right&&b.right>r.right));return ok;});}
for(const idioma of ['es','en'] as const)test(`header compartido en cada sección administrativa ${idioma}`,async({page,context},info)=>{
 const {token}=JSON.parse(await readFile('.privado/contenido-pruebas/sesion.json','utf8'));
 await context.addCookies([{name:'sg-admin-local',value:token,domain:'127.0.0.1',path:'/'},{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 for(const ruta of ['/panel','/panel/catalogo','/panel/proveedores','/panel/contenido','/panel/pedidos','/panel/usuarios','/panel/estadisticas']){
  await page.goto(ruta);const header=page.locator('.pedidos-reales-nav');
  if(ruta==='/panel/pedidos'){await mkdir('.privado/pedidos-reales',{recursive:true});await page.screenshot({path:`.privado/pedidos-reales/navegacion-${info.project.name}-${idioma}.png`});}
  await expect(header).toBeVisible();await expect(page.locator('header.cabecera')).toHaveCount(0);
  await expect(header.locator('a[aria-current=page]')).toHaveAttribute('href',ruta);
  await expect(header.locator('.panel-idiomas, [data-cerrar-sesion]')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('lang',idioma);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const activo=header.locator('nav a[aria-current=page]');
  await expect.poll(()=>activo.evaluate(el=>{
   const header=el.closest('header')!,nav=el.closest('nav')!,texto=el.querySelector('span')!,h=header.getBoundingClientRect();
   if(innerWidth>1100){const main=document.querySelector('.panel-diseno>main')!.getBoundingClientRect();return getComputedStyle(nav).flexDirection==='column'&&h.width<=260&&main.left>=h.right-1&&getComputedStyle(el,'::before').backgroundColor==='rgb(239, 78, 43)';}
   const s=texto.getBoundingClientRect(),indicador=getComputedStyle(texto,'::after');
   return Math.abs(s.bottom-h.bottom)<=1&&indicador.backgroundColor==='rgb(239, 78, 43)'&&indicador.bottom==='0px'&&Math.abs(parseFloat(indicador.width)-s.width)<=1&&el.clientWidth<texto.clientWidth+40;
  })).toBe(true);
  await expect(header.locator('nav')).toHaveCSS('scrollbar-width','none');
 }
});
