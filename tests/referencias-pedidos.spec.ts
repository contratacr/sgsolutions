import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {referenciaPedido} from '../src/lib/referencia-pedido';
import es from '../messages/es.json';import en from '../messages/en.json';
test('formato legible, crecimiento y compatibilidad histórica',()=>{
 expect(referenciaPedido('abcdef12-0000-4000-8000-000000000000',1)).toBe('SG-0001');
 expect(referenciaPedido('id',10000)).toBe('SG-10000');
 expect(referenciaPedido('id','123456789012345')).toBe('SG-123456789012345');
 expect(referenciaPedido('abcdef12-0000-4000-8000-000000000000')).toBe('SG-ABCDEF1200');
});
for(const idioma of ['es','en'] as const)test(`referencia nueva y búsqueda anterior en panel ${idioma}`,async({page,context,request},info)=>{
 await request.get('http://127.0.0.1:3135/reset');
 const {token}=JSON.parse(await readFile('.privado/contenido-pruebas/sesion.json','utf8'));
 await context.addCookies([{name:'sg-admin-local',value:token,domain:'127.0.0.1',path:'/'},{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 await page.goto('/panel/pedidos');
 const bandeja=page.locator('.pedidos-reales-bandeja:visible'),filas=bandeja.locator('.pedidos-admin-tarjeta');
 const buscar=bandeja.getByLabel((idioma==='es'?es:en).PropuestaPedidos.buscar,{exact:true});
 await expect(buscar).toBeEnabled();
 const intentos=bandeja.getByRole('button',{name:new RegExp('^'+(idioma==='es'?es:en).PropuestaPedidos.intentos)});
 await intentos.click();await expect(intentos).toHaveAttribute('aria-pressed','true');
 await buscar.fill('SG-0044');await expect(filas).toHaveCount(1);await expect(filas).toContainText('Rechazado');
 await expect(filas.locator('.panel-pedido-detalle>summary')).toContainText('SG-0044');
 await buscar.fill('SG-0000000000');await expect(filas).toHaveCount(1);
 await bandeja.getByRole('button',{name:new RegExp('^'+(idioma==='es'?es:en).PropuestaPedidos.por_atender)}).click();await expect(filas).toHaveCount(2);
 await buscar.fill('SG-0043');await expect(filas).toHaveCount(1);await expect(filas).toContainText('Envío');
 await expect(page.locator('html')).toHaveAttribute('lang',idioma);await page.reload();await expect(page.locator('html')).toHaveAttribute('lang',idioma);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.screenshot({path:`.privado/evidencias/referencias-${idioma}-${info.project.name}.png`,fullPage:true});
});
