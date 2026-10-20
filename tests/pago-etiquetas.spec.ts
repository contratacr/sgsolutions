import {test,expect} from '@playwright/test';
test.skip(process.env.SG_TEST_PEDIDO_VISTA!=='1','Requiere pedidos simulados aislados.');
for(const idioma of ['es','en'])test(`pagos reales y simulados muestran etiquetas correctas ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 await page.goto('/pago/resultado?pedido=00000000-0000-4000-8000-000000000000');await expect(page.locator('h1')).toHaveText(idioma==='es'?'Pago confirmado.':'Payment confirmed.');await expect(page.locator('.panel-aviso')).toHaveCount(0);
 await page.goto('/pago/resultado?pedido=00000000-0000-4000-8000-000000000001');await expect(page.locator('.panel-aviso')).toContainText(idioma==='es'?'Transacción de prueba':'Test transaction');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

for(const idioma of ['es','en'])for(const pagado of [false,true])test(`retorno ${pagado?'confirmado':'cancelado'} conserva o retira solo la compra correcta ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 const pedido='00000000-0000-4000-8000-00000000000'+(pagado?'0':'9');
 await page.goto('/tienda');
 await page.evaluate(async({pedido})=>{
  const claveBorrador='sg-compra-borrador-v1:carrito';const borrador=JSON.stringify({fecha:Date.now(),datos:{nombre:'Ana'},paso:2,pago:'tarjeta'});
  localStorage.setItem('sg-carrito-v1',JSON.stringify([{id:'qa-producto',cantidad:3}]));
  sessionStorage.setItem(claveBorrador,borrador);
  const comparacion=JSON.parse(borrador);delete comparacion.fecha;const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(comparacion)));const huella=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
  sessionStorage.setItem('sg-pago-pendiente-v1:'+claveBorrador,JSON.stringify({fecha:Date.now(),pedido,ruta:'/pagar',claveBorrador,borrador:huella,articulos:[{id:'qa-producto',cantidad:1}]}));
 },{pedido});
 await page.goto('/pago/resultado?pedido='+pedido);
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sg-carrito-v1')!)[0].cantidad)).toBe(pagado?2:3);
 expect(await page.evaluate(()=>sessionStorage.getItem('sg-compra-borrador-v1:carrito')!==null)).toBe(!pagado);
 if(!pagado)await expect(page.getByRole('link',{name:idioma==='es'?'Volver a mi pedido':'Return to my order'})).toHaveAttribute('href','/pagar');
 await page.reload();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('sg-carrito-v1')!)[0].cantidad)).toBe(pagado?2:3);
});
