import {readFile} from 'node:fs/promises';
import {test,expect} from '@playwright/test';
test('administrador puede preparar un enlace con un equipo empresarial',async({page,context,baseURL})=>{
 const {randomBytes,createHash}=await import('node:crypto');
 const {writeFile}=await import('node:fs/promises');
 const cuentaPath='.privado/contenido-pruebas/cuenta.json',pedidosPath='.privado/contenido-pruebas/asesorias.json';
 const original=await readFile(cuentaPath,'utf8');
 const anteriores=await readFile(pedidosPath,'utf8').catch(()=>null);
 const cuenta=JSON.parse(original),token=randomBytes(32).toString('hex');
 cuenta.sesiones.push({hash:createHash('sha256').update(token).digest('hex'),vence:Date.now()+120000});
 try{
  await writeFile(cuentaPath,JSON.stringify(cuenta));
  await context.addCookies([{name:'sg-admin-local',value:token,url:baseURL!}]);
  await page.goto('/panel/pedidos');
  await page.getByRole('button',{name:'Crear pedido',exact:true}).click();
  const nueva=page.locator('.panel-nueva-asesoria:visible');
  await nueva.locator('input[type=search]').fill('POE-24-24W-G');
  await nueva.locator('.asesoria-busqueda-resultados button').filter({hasText:'POE-24-24W-G'}).first().click();
  await nueva.locator('[name=confirmado]').check();
  await nueva.getByRole('button',{name:/Generar enlace de compra|Generate checkout link/}).click();
  await page.waitForURL(u=>u.searchParams.get('resultado')==='enlace_generado');
  const registros=JSON.parse(await readFile(pedidosPath,'utf8'));
  const pedido=registros.find((p:{id:string})=>p.id===new URL(page.url()).searchParams.get('asesoria'));
  expect(pedido.articulos[0].producto.id).toBe('empresa-intcomex-es000ubq07');
  expect(pedido.articulos[0].producto.precio).toBe(5000);
  const enlace=await page.locator(`[id="enlace-${pedido.id}"] textarea`).inputValue();
  await context.clearCookies();
  await page.goto(new URL(enlace).pathname);
  await expect(page.locator('main form')).toBeVisible();
  await expect(page.locator('main')).toContainText('POE-24-24W-G');
 }finally{
  await writeFile(cuentaPath,original);
  if(anteriores!==null)await writeFile(pedidosPath,anteriores);
  else{const {unlink}=await import('node:fs/promises');await unlink(pedidosPath).catch(()=>{});}
 }
});
