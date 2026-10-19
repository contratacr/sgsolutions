import {test,expect} from '@playwright/test';
import inicial from '../src/lib/catalogo-base.json';
import {esquemaCatalogo,publicarCatalogo} from '../src/lib/catalogo-modelo';
import {incorporarSoftware,completarSoftwarePublico} from '../src/lib/incorporar-software';
import {esProductoSoftware,SOFTWARE_ID,limiteCantidadProducto,modalidadCompraValida} from '../src/lib/software';
import {reconciliarEurocomp} from '../src/lib/eurocomp-catalogo';
import {migrarCatalogoManual} from '../src/lib/catalogo-manual';
import {datosClienteCompra} from '../src/lib/datos-cliente-compra';
import {costoEntrega} from '../src/lib/envio';
import {siguientesEstadosEntrega} from '../src/lib/estado-entrega';
import {patronIdFavorito} from '../src/lib/favoritos-identidad';
const datos={nombre:'Cliente',apellidos:'QA',correo:'cliente@example.test',telefono:'+50688888888',modalidad:'digital',factura:'tiquete',consentimiento:'on'};
test('software curado: sincronización, precio, publicación, límites y entrega sin inventario ficticio',()=>{
 const base=incorporarSoftware(esquemaCatalogo.parse(inicial)),p=base.productos.find(esProductoSoftware)!;
 expect(p.inventarioPropio).toBe(false);expect(p.costoUsd).toBeNull();expect(p.precioReferencia).toBe(42000);
 for(const c of [base,migrarCatalogoManual(base),reconciliarEurocomp(base,{fecha:new Date().toISOString(),bodega:0,articulos:[]})]){
  const publico=publicarCatalogo(c),s=publico.productos.find(esProductoSoftware)!;expect(s.precio).toBe(42000);expect(s.stockDisponible).toBeNull();expect(s.limitePorPedido).toBe(30);expect(s.entregaDigital).toBe(true);expect(JSON.stringify(s)).not.toContain('costoUsd');
 }
 expect(esProductoSoftware({...p,id:'software-intcomex-otro'})).toBe(false);expect(patronIdFavorito.test(SOFTWARE_ID)).toBe(true);expect(patronIdFavorito.test('software-intcomex-otro')).toBe(false);
 p.publicado=false;expect(completarSoftwarePublico(publicarCatalogo(base),base).productos.some(esProductoSoftware)).toBe(false);
 expect(limiteCantidadProducto(SOFTWARE_ID)).toBe(30);expect(datosClienteCompra.safeParse(datos).success).toBe(true);expect(costoEntrega('digital')).toBe(0);
 expect(modalidadCompraValida([{producto:p}],'digital')).toBe(true);expect(modalidadCompraValida([{producto:p}],'retiro')).toBe(false);expect(modalidadCompraValida([{producto:p},{producto:{id:'eurocomp-ejemplo'}}],'digital')).toBe(false);expect(siguientesEstadosEntrega('preparando','digital')).toEqual(['entregado']);
});
for(const idioma of ['es','en'] as const)test(`software en tienda, carrito y entrega digital ${idioma}`,async({page,context,request,baseURL},info)=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 const response=await request.get('/api/catalogo?ids='+SOFTWARE_ID),{productos}=await response.json();expect(productos).toHaveLength(1);const p=productos[0];expect(p.precio).toBe(42000);expect(p.stockDisponible).toBeNull();
 await page.goto('/tienda');await page.locator('#buscar-equipo').fill('EP2-32316');const card=page.locator('.shop-producto').filter({hasText:'Microsoft 365 Personal'});await expect(card).toHaveCount(1);await expect(card).toContainText(idioma==='es'?'Bajo pedido':'On order');
 await card.screenshot({path:`.privado/evidencias/software-tarjeta-${idioma}-${info.project.name}.png`});await card.hover();await card.locator('.producto-agregar').click();await page.getByRole('button',{name:idioma==='es'?'Abrir carrito':'Open cart',exact:true}).click();await expect(page.locator('.contador-cantidad input')).toHaveAttribute('max','30');await page.locator('.contador-cantidad input').fill('30');await page.locator('.contador-cantidad input').dispatchEvent('change');await expect(page.locator('.contador-cantidad button').last()).toBeDisabled();
 await page.goto('/pagar');await expect(page.locator('input[name=modalidad]')).toHaveCount(1);await expect(page.locator('input[name=modalidad]')).toHaveValue('digital');await expect(page.locator('[name=direccion]')).toHaveCount(0);await expect(page.locator('.compra-total dd')).toHaveText(/1[\s\u00a0]?260[\s\u00a0]?000/);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:`.privado/evidencias/software-${idioma}-${info.project.name}.png`});
 const headers={origin:baseURL!,'cf-connecting-ip':`software-${info.project.name}-${idioma}`};
 const verificar=(cantidad:number,precio:number)=>request.post('/api/compra/verificar',{headers,data:{idioma,articulos:[{id:SOFTWARE_ID,cantidad,precio}]}});
 expect((await verificar(31,42000)).status()).toBe(409);expect((await verificar(1,1)).status()).toBe(409);const aprobado=await verificar(30,42000);expect(aprobado.status()).toBe(200);const acceso=await aprobado.json();
 const compra={asesoria:acceso.id,acceso:acceso.token,idioma,datos:{...datos,modalidad:'retiro'},metodo:'sinpe',articulos:[{id:SOFTWARE_ID,cantidad:30}]};
 expect((await request.post('/api/pedidos/manual',{headers,data:compra})).status()).toBe(400);
 const r=await request.post('/api/pedidos/manual',{headers,data:{...compra,datos}});expect(r.status()).toBe(201);const recibo=await r.json();
 const filas=await (await request.get('http://127.0.0.1:3135/rest/v1/pedidos_manuales')).json();const pedido=filas.find((x:{id:string})=>x.id===new URL(recibo.url,baseURL!).searchParams.get('pedido'));expect(pedido.costo_envio).toBe(0);expect(pedido.total_cobrar).toBe(1260000);expect(pedido.cliente.modalidad).toBe('digital');expect(pedido.estado).toBe('pendiente_pago');
 expect((await request.post('/api/pedidos/manual',{headers,data:{...compra,datos}})).status()).toBe(403);
 const segunda=await verificar(1,42000);expect(segunda.status()).toBe(200);const permiso=await segunda.json();
 const tarjeta=await request.post('/api/pagos/tilopay/iniciar',{headers,data:{asesoria:permiso.id,acceso:permiso.token,idioma,nombre:datos.nombre,apellidos:datos.apellidos,correo:datos.correo,telefono:datos.telefono,consentimiento:true,datos,articulos:[{id:SOFTWARE_ID,cantidad:1}]}});expect(tarjeta.status()).toBe(200);
 const simulado=await (await request.get('http://127.0.0.1:3135/pago-simulado')).json();expect(simulado.amount).toBe('42000.00');expect(simulado.orderNumber).toMatch(/^[a-f0-9-]{36}$/);
 const pagos=await (await request.get('http://127.0.0.1:3135/rest/v1/pedidos_tilopay?id=eq.'+simulado.orderNumber)).json();expect(pagos[0].estado).toBe('pendiente');expect(pagos[0].cliente.costo_envio).toBe(0);expect(pagos[0].entorno).toBe('pruebas');
});
