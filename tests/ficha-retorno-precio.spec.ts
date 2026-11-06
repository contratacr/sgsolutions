import {test,expect} from '@playwright/test';
import {writeFile,unlink} from 'node:fs/promises';
import base from '../src/lib/catalogo-base.json';
import {esquemaCatalogo} from '../src/lib/catalogo-modelo';
import {VERSION_PREFERENCIAS_MEDICION} from '../src/lib/preferencias-medicion';
const archivo='.privado/contenido-pruebas/catalogo.json';
test.afterEach(async()=>{await unlink(archivo).catch(()=>{});});
for(const idioma of ['es','en'])test('precio legible y retorno sin agregar filtros '+idioma,async({page,context},info)=>{
 const c=esquemaCatalogo.parse(base),ejemplo=c.productos.find(p=>p.codigoEurocomp)!;
 const producto={...ejemplo,id:'manual-precio-qa',origen:'manual' as const,slug:'manual-precio-qa',codigoEurocomp:undefined,eurocomp:undefined,proveedor:undefined,coleccion:undefined,categoria:'computadoras',nombre:{es:'Portátil QA de oferta',en:'Discount laptop QA'},marca:'Lenovo',codigoFabricante:'QA-PRECIO',imagen:'/imagenes/logo-principal.png',imagenes:[],stockManual:3,precioManual:442900,precioDescuento:388000,publicado:true};
 c.productos=[producto,{...producto,id:'manual-normal-qa',slug:'manual-normal-qa',precioManual:80000,precioDescuento:null}];await writeFile(archivo,JSON.stringify({contenido:c,revision:1}));
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 await page.addInitScript(version=>localStorage.setItem('sg-medicion',JSON.stringify({version,analitica:false,publicidad:false})),VERSION_PREFERENCIAS_MEDICION);
 await page.route('https://**/*',r=>r.abort());
 for(const variante of ['precio','normal']){
  await page.goto('/tienda/manual-'+variante+'-qa');
  await expect(page.locator('html')).toHaveAttribute('lang',idioma);await expect(page.locator('.ficha-disponibles')).toBeVisible();
  const medidas=await page.evaluate(()=>{const a=document.querySelector('.ficha-importe')!.getBoundingClientRect(),b=document.querySelector('.ficha-disponibles')!.getBoundingClientRect();return {movil:innerWidth<=650,separacionX:b.left-a.right,separacionY:b.top-a.bottom,desborda:document.documentElement.scrollWidth>innerWidth+1};});
  expect(medidas.desborda).toBe(false);expect(medidas.movil?medidas.separacionY:medidas.separacionX).toBeGreaterThanOrEqual(medidas.movil?4:16);
  await page.locator('.ficha-precio-acciones').screenshot({path:info.outputPath(variante+'.png')});
 }
 for(const categoria of [false,true]){
  await page.goto('/tienda?q=poe&m=ubiquiti&o=precio'+(categoria?'&c=soluciones-empresariales':''));
  const ficha=page.locator('.shop-producto h3 a').first(),href=await ficha.getAttribute('href');expect(href).toBeTruthy();
  await ficha.click();await expect(page).toHaveURL(new RegExp(href+'$'));
  const volver=page.locator('.ficha-volver');
  await expect(volver).toHaveAttribute('href','/tienda?q=poe'+(categoria?'&c=soluciones-empresariales':'')+'&m=ubiquiti&o=precio');
  if(categoria)await volver.click();else await page.goBack();await expect(page.locator('#buscar-equipo')).toHaveValue('poe');
  const url=new URL(page.url());expect(url.searchParams.get('c')).toBe(categoria?'soluciones-empresariales':null);expect(url.searchParams.has('categoria')).toBe(false);expect(url.searchParams.getAll('m')).toEqual(['ubiquiti']);expect(url.searchParams.get('o')).toBe('precio');
  // Fresh/direct entry into an enterprise product must not manufacture a category filter.
  await page.evaluate(()=>sessionStorage.removeItem('sg-retorno-tienda-v1'));await page.goto(href!);await expect(page.locator('.ficha-volver')).toHaveAttribute('href','/tienda');
 }
});
