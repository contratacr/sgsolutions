import {test, expect} from '@playwright/test';
import {rutaPedido, datosEnlacePedido} from '../src/lib/enlace-pedido';
import {plantillaCorreo} from '../src/lib/email/plantilla';
const id='12345678-1234-4234-8234-123456789abc', acceso='ab'.repeat(32);
test('enlace compacto conserva todos los bits y enlaces anteriores',()=>{
 const ruta=rutaPedido(id,acceso);
 expect(ruta).toHaveLength(72);
 expect(datosEnlacePedido(new URL(ruta,'https://example.test'))).toEqual({pedido:id,acceso});
 expect(datosEnlacePedido(new URL('https://example.test/finalizar-compra/pedido?pedido='+id+'&acceso='+acceso))).toEqual({pedido:id,acceso});
 for(const path of ['/pedido/no-valido','/pedido/'+ 'a'.repeat(63),'/pedido/'+ 'a'.repeat(65)])expect(datosEnlacePedido(new URL(path,'https://example.test')).pedido).toBe('');
});
for(const idioma of ['es','en'])test('correo con botón y sin URL visible '+idioma,()=>{
 const url='https://sgsolutionscr.com'+rutaPedido(id,acceso);
 const label=idioma==='es'?'Ver mi pedido':'View my order';
 const html=plantillaCorreo('<Pedido>', 'Detalle: '+url,{texto:label,url});
 expect(html).toContain('href="'+url+'"');
 expect(html.split(url)).toHaveLength(2);
 expect(html).toContain(label);
 expect(html).toContain('&lt;Pedido&gt;');
});
test('enlace manipulado no revela pedido',async({page})=>{
 await page.goto('/pedido/'+'a'.repeat(64));
 await expect(page.locator('.pedido-numero')).toHaveCount(0);
 await expect(page.locator('main h1')).toBeVisible();
});
