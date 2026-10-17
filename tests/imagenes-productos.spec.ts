import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {test,expect} from '@playwright/test';
import {resolverImagenProducto,tieneImagenProducto} from '../src/lib/imagenes-productos';
import reparadas from '../src/lib/imagenes-productos-verificadas.json';
import {publicarCatalogo,esquemaCatalogo} from '../src/lib/catalogo-modelo';
import inicial from '../src/lib/catalogo-inicial.json';
import empresas from '../src/lib/catalogo-empresarial.json';

test('las 31 fotografías recuperadas existen y son imágenes decodificables',async()=>{
 expect(reparadas).toHaveLength(31);
 for(const f of reparadas){
  const bytes=await readFile('public'+f.imagen);
  const meta=await sharp(bytes).metadata();
  expect(meta.width).toBeGreaterThan(40);expect(meta.height).toBeGreaterThan(40);
  expect(f.origen).toMatch(/^https:\/\//);
 }
});

test('las reparaciones respetan modelo, marca y fotografías editoriales',()=>{
 const f=reparadas.find(p=>p.mpn==='MEGA 12')!;
 const p={id:f.id,marca:f.marca,codigoFabricante:f.mpn,imagen:f.sustituye[0],imagenes:[]};
 expect(resolverImagenProducto(p).imagen).toBe(f.imagen);
 expect(resolverImagenProducto({...p,codigoFabricante:'OTRO MODELO'}).imagen).not.toBe(f.imagen);
 expect(resolverImagenProducto({...p,marca:'OTRA MARCA'}).imagen).not.toBe(f.imagen);
 expect(resolverImagenProducto({...p,imagen:'/imagenes/admin/propia.webp'}).imagen).toBe('/imagenes/admin/propia.webp');
 expect(resolverImagenProducto({...p,codigoFabricante:'OTRO',imagenes:['/imagenes/admin/alternativa.webp']}).imagen).toBe('/imagenes/admin/alternativa.webp');
});

test('pendientes no se publican; el administrador conserva toda la información',()=>{
 const pendiente=empresas.find(p=>p.id==='empresa-intcomex-nt099del92')!;
 const c=esquemaCatalogo.parse({...inicial,productos:[pendiente]});
 expect(tieneImagenProducto(c.productos[0])).toBe(false);
 expect(publicarCatalogo(c).productos).toHaveLength(0);
 expect(publicarCatalogo(c,true).productos[0].id).toBe(pendiente.id);
 expect(c.productos[0].codigoFabricante).toBe(pendiente.codigoFabricante);
});

for(const idioma of ['es','en'])test(`Blackview tiene su fotografía real y el idioma persiste ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 await page.goto('/tienda');
 await page.locator('#buscar-equipo').fill('MEGA 12');
 const foto=page.locator('img[src*="productos-verificados%2Feurocomp-1033d8f39c82487e"], img[src*="productos-verificados/eurocomp-1033d8f39c82487e"]').first();
 await expect(foto).toBeVisible();
 await expect.poll(()=>foto.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>40)).toBe(true);
 await expect(page.locator('.shop-imagen-pendiente')).toHaveCount(0);
 await page.reload();await expect(foto).toBeVisible();
 expect((await context.cookies()).find(c=>c.name==='sg-idioma')?.value).toBe(idioma);
});
