import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import http from 'node:http';
import {chromium,webkit} from '@playwright/test';
const root=new URL('../www/',import.meta.url);
const config=JSON.parse(await readFile(new URL('../capacitor.config.json',import.meta.url)));
assert.equal(config.appId,'com.sgsolutionscr.app.dev');
assert.equal(config.server,undefined);
const server=http.createServer(async(req,res)=>{
 const name=req.url==='/'?'index.html':req.url.slice(1);
 if(!['index.html','app.js','style.css','logo.png'].includes(name)){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':'text/html');
 res.end(await readFile(new URL(name,root)));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}`;
try{
 for(const engine of [chromium,webkit]){
  const browser=await engine.launch();
  try{
   for(const width of [390,1280]){
    const page=await browser.newPage({viewport:{width,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url);assert.equal(await page.locator('html').getAttribute('lang'),'es');
    await page.getByRole('button',{name:'EN',exact:true}).click();assert.equal(await page.locator('html').getAttribute('lang'),'en');
    await page.reload();assert.equal(await page.locator('html').getAttribute('lang'),'en');
    await page.getByRole('button',{name:'ES',exact:true}).click();assert.equal(await page.locator('html').getAttribute('lang'),'es');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    const denied=await page.evaluate(async()=>{try{await fetch('https://sgsolutionscr.com');return false;}catch{return true;}});assert.equal(denied,true);
    assert.deepEqual(errors,[]);await page.close();
   }
  }finally{await browser.close();}
 }
 console.log('Base móvil: identidad de desarrollo, aislamiento de red, idiomas persistentes y 4 variantes de navegador/tamaño correctos.');
}finally{server.close();}
