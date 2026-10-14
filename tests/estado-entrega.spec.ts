import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import es from '../messages/es.json';import en from '../messages/en.json';
import {estadoGestion,siguientesEstadosEntrega} from '../src/lib/estado-entrega';
test('el estado del pago y la entrega son independientes',()=>{
 expect(estadoGestion('rechazado','pendiente_preparar')).toBe('sin_pago');expect(estadoGestion('pagado','pendiente_preparar')).toBe('pendiente_preparar');expect(siguientesEstadosEntrega('preparando','envio')).toEqual(['enviado']);expect(siguientesEstadosEntrega('preparando','retiro')).toEqual(['listo_retiro']);expect(siguientesEstadosEntrega('entregado','envio')).toEqual([]);
});
for(const idioma of ['es','en'])test(`gestión de retiro y envío, etiquetas y filtros ${idioma}`,async({page,context,request})=>{
 await request.get('http://127.0.0.1:3135/reset');const {token}=JSON.parse(await readFile('.privado/contenido-pruebas/sesion.json','utf8'));
 await context.addCookies([{name:'sg-admin-local',value:token,domain:'127.0.0.1',path:'/'},{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 const t=(idioma==='es'?es:en).EntregaAdmin;
 for(const [seccion,nombre,medio] of [['manuales','Retiro','listo_retiro'],['tarjeta','Envío','enviado']] as const){
 await page.goto('/panel/pedidos?seccion='+seccion);
 await page.locator('.panel-pedidos-seccion:visible').getByRole('button',{name:new RegExp('^'+(idioma==='es'?'Todos':'All'))}).click();
 const section=page.locator('.panel-pedidos-seccion:visible');await expect(section.locator('.panel-lista-vistas button')).toHaveCount(4);const pago=section.getByLabel((idioma==='es'?es:en).PanelLista.estadoPago,{exact:true});await pago.click();await page.locator('[data-valor=confirmado]').click();for(const chip of await section.locator('.pedido-estados>div:first-child .pedido-estado-chip').all())await expect(chip).toHaveText(t.pago_pagado);await pago.click();await page.locator('[data-valor=todos]').click();const card=section.locator('.pedidos-admin-tarjeta').filter({hasText:nombre}).first();
 await expect(card.locator('.pedido-estados')).toContainText(t.pago);await expect(card.locator('.pedido-estados')).toContainText(t.pedido);await expect(card.locator('.pedido-estados')).toContainText(t.pendiente_preparar);
 if(!await card.locator('.panel-pedido-detalle').getAttribute('open').then(x=>x!==null))await card.locator('.panel-pedido-detalle>summary').click();await expect(card.locator('.pedido-estados')).toHaveCount(1);
 await card.getByRole('button',{name:t.accion_preparando,exact:true}).click();await expect(page.getByRole('status').filter({hasText:t.guardado})).toBeVisible();
 if(!await card.locator('.panel-pedido-detalle').getAttribute('open').then(x=>x!==null))await card.locator('.panel-pedido-detalle>summary').click();await expect(card.locator('.pedido-estados')).toContainText(t.preparando);
 await card.getByRole('button',{name:t[`accion_${medio}`],exact:true}).click();if(!await card.locator('.panel-pedido-detalle').getAttribute('open').then(x=>x!==null))await card.locator('.panel-pedido-detalle>summary').click();await expect(card.locator('.pedido-estados')).toContainText(t[medio]);
 await card.getByRole('button',{name:t.accion_entregado,exact:true}).click();if(!await card.locator('.panel-pedido-detalle').getAttribute('open').then(x=>x!==null))await card.locator('.panel-pedido-detalle>summary').click();await expect(card.locator('.pedido-estados')).toContainText(t.entregado);await expect(card.locator('.pedido-gestion-entrega button')).toHaveCount(0);
 await section.getByRole('button',{name:new RegExp('^'+(idioma==='es'?'Por atender':'Needs attention'))}).click();await expect(card).toHaveCount(0);
 await section.getByRole('button',{name:new RegExp('^'+(idioma==='es'?'Finalizados':'Completed'))}).click();await expect(card).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
 await page.goto('/panel/pedidos?seccion=tarjeta');const rechazado=page.locator('main.seccion:visible .pedidos-admin-tarjeta').filter({hasText:'Rechazado QA'});await rechazado.locator('.panel-pedido-detalle>summary').click();await expect(rechazado.locator('.pedido-estados')).toContainText(t.sin_pago);await expect(rechazado.locator('.pedido-gestion-entrega')).toHaveCount(0);
});
