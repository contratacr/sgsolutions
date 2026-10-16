import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import http from 'node:http';
import {chromium,webkit,expect} from '@playwright/test';
const root=new URL('../www/',import.meta.url),evidence=new URL('../../.privado/mobile-testing/',import.meta.url);
await mkdir(evidence,{recursive:true});
// Distribution defaults are checked separately by preview-config.mjs.
const files=['offline.html','offline.js','offline.css','index.html','app.js','style.css','logo.png','portatil.webp','oficina.webp','red.webp','pos.webp'];
const server=http.createServer(async(req,res)=>{
 const name=req.url==='/'?'index.html':req.url.slice(1);
 if(!files.includes(name)){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.webp')?'image/webp':'text/html');
 res.end(await readFile(new URL(name,root)));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}`;
try{
 for(const engine of [chromium,webkit]){
  const browser=await engine.launch();
  try{
   for(const width of [390,1280]){
    const context=await browser.newContext({viewport:{width,height:844}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);console.log(engine.name(),width);
    await page.goto(url);await expect(page.locator('.product')).toHaveCount(4);
    await page.getByLabel('Buscar productos').fill('Portátil');await expect(page.locator('.product')).toHaveCount(1);
    await page.getByRole('button',{name:'Añadir al carrito: Portátil de estudio'}).click();await expect(page.getByRole('status').last()).toContainText('añadido');
    await page.getByRole('link',{name:'Carrito (1)',exact:true}).click();await expect(page.locator('h1')).toHaveText('Carrito (1)');
    await page.getByRole('button',{name:'Aumentar cantidad: Portátil de estudio'}).click();await expect(page.locator('h1')).toHaveText('Carrito (2)');
    await page.reload();await expect(page.locator('h1')).toHaveText('Carrito (2)');
    await page.getByRole('button',{name:'EN',exact:true}).click();await expect(page.locator('h1')).toHaveText('Cart (2)');
    await page.getByRole('link',{name:'Support',exact:true}).click();await page.getByLabel('Equipment or model').fill('Demo 15');await page.getByLabel('What is happening?').fill('<script>not code</script>');
    await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByRole('status')).toContainText('not been sent');
    await page.getByRole('link',{name:'Business',exact:true}).click();await page.getByLabel('Your business activity').fill('Demo office');await page.getByRole('button',{name:'Save draft',exact:true}).click();
    await page.reload();await expect(page.getByLabel('Your business activity')).toHaveValue('Demo office');
    await page.getByRole('link',{name:'Support',exact:true}).click();await expect(page.getByLabel('Equipment or model')).toHaveValue('Demo 15');await expect(page.getByLabel('What is happening?')).toHaveValue('<script>not code</script>');
    await page.getByRole('button',{name:'Delete draft',exact:true}).click();await expect(page.getByLabel('Equipment or model')).toHaveValue('');
    await page.getByRole('link',{name:'Store',exact:true}).click();await page.getByLabel('Search products').fill('');await page.getByLabel('Category',{exact:true}).selectOption('networks');await expect(page.locator('.product')).toHaveCount(1);
    await page.getByLabel('Category',{exact:true}).selectOption('all');await page.getByLabel('Sort',{exact:true}).selectOption('ascending');await expect(page.locator('.product h2').first()).toHaveText('Desktop accessory');
    await page.locator('.product a').first().click();await expect(page.locator('h1')).toHaveText('Desktop accessory');await page.goBack();await expect(page.locator('.product')).toHaveCount(4);
    await page.getByRole('button',{name:'ES',exact:true}).click();await page.reload();await expect(page.locator('html')).toHaveAttribute('lang','es');
    await page.screenshot({path:new URL(`${engine.name()}-${width}-store.png`,evidence).pathname.replaceAll('%20',' '),fullPage:true});
    for(const hash of ['soporte','empresas','carrito','producto/demo-notebook']){
      await page.goto(`${url}/#${hash}`);await expect(page.locator('h1')).toBeVisible();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.screenshot({path:new URL(`${engine.name()}-${width}-${hash.replace('/','-')}.png`,evidence).pathname.replaceAll('%20',' '),fullPage:true});
    }
    const denied=await page.evaluate(async()=>{try{await fetch('https://sgsolutionscr.com');return false;}catch{return true;}});assert.equal(denied,true);
    await page.getByRole('link',{name:'Carrito (2)',exact:true}).click();await page.getByRole('button',{name:'Eliminar: Portátil de estudio'}).click();await expect(page.getByRole('heading',{name:'Su carrito está vacío'})).toBeVisible();await page.reload();await expect(page.getByRole('heading',{name:'Su carrito está vacío'})).toBeVisible();
    await page.goto(`${url}/offline.html`);
    await page.getByRole('button',{name:'EN',exact:true}).click();
    await expect(page.locator('h1')).toHaveText('Unable to connect');
    await page.reload();await expect(page.locator('html')).toHaveAttribute('lang','en');
    await page.getByRole('button',{name:'ES',exact:true}).click();
    await expect(page.locator('h1')).toHaveText('No se pudo conectar');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.deepEqual(errors,[]);await context.close();
   }
  }finally{await browser.close();}
 }
 console.log('Móvil: 4 variantes Chromium/WebKit, rutas, idiomas, filtros, carrito persistente, borradores y aislamiento correctos.');
}finally{server.close();}
