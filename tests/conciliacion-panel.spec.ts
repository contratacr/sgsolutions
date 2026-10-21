import {test,expect} from '@playwright/test';
import {readFile,mkdir} from 'node:fs/promises';
import es from '../messages/es.json';import en from '../messages/en.json';
for(const idioma of ['es','en'] as const)test(`intentos separados de compras pagadas ${idioma}`,async({page,context,request},info)=>{
 await request.get('http://127.0.0.1:3135/reset?pendiente=1');
 const {token}=JSON.parse(await readFile('.privado/contenido-pruebas/sesion.json','utf8'));
 await context.addCookies([{name:'sg-admin-local',value:token,domain:'127.0.0.1',path:'/'},{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 const t=(idioma==='es'?es:en).PropuestaPedidos,e=(idioma==='es'?es:en).EntregaAdmin;
 await page.goto('/panel/pedidos');const bandeja=page.locator('.pedidos-reales-bandeja:visible');
 await expect(bandeja.getByLabel(t.buscar,{exact:true})).toBeEnabled();
 await expect(bandeja.locator('.pedidos-admin-lista')).not.toContainText('Luis QA');
 await bandeja.getByRole('button',{name:new RegExp('^'+t.intentos)}).click();
 if(info.project.name==='safari-mobile'){await expect.poll(()=>bandeja.locator('.pedidos-reales-vistas').evaluate(el=>{const activo=el.querySelector('[aria-pressed=true]')!.getBoundingClientRect(),barra=el.getBoundingClientRect();return activo.left>=barra.left-1&&activo.right<=barra.right+1;})).toBe(true);}
 const filas=bandeja.locator('.pedidos-admin-tarjeta');await expect(filas).toHaveCount(1);await expect(filas).toContainText('Luis QA');await expect(filas).toContainText(e.sinConfirmacion);await expect(filas).toContainText(e.intentoCompra);
 await filas.locator('.panel-pedido-detalle>summary').click();await expect(filas.locator('.pedido-gestion-entrega')).toHaveCount(0);await expect(filas.locator('.panel-contacto-cliente')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await mkdir('.privado/evidencias',{recursive:true});await page.screenshot({path:`.privado/evidencias/intentos-${info.project.name}-${idioma}.png`,fullPage:true});
 await bandeja.getByRole('button',{name:new RegExp('^'+t.por_atender)}).click();await expect(bandeja.locator('.pedidos-admin-lista')).not.toContainText('Luis QA');
});
