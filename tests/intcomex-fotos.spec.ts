import {test,expect} from '@playwright/test';
import {coincidenciasFoto,urlFotoPermitida,buscarFotoIntcomex} from '../src/lib/intcomex/fotos';
import {readFile} from 'node:fs/promises';
const listado='<div id="row_123"><a href="/es-XCR/Product/Detail/123">Equipo</a><span>SKU:</span>&nbsp;<span>SKU-1</span><span>MPN:</span>&nbsp;<span>MPN-1</span></div>';
test('solo acepta modelos exactos y hosts de imágenes autorizados',()=>{
 expect(coincidenciasFoto(listado,'SKU-1','MPN-1')).toEqual([{id:'123',sku:'SKU-1'}]);
 expect(coincidenciasFoto(listado,'OTRO','MPN')).toEqual([]);
 for(const url of ['http://store.intcomex.com/foto.jpg','https://evil.test/foto.jpg','https://store.intcomex.com@127.0.0.1/foto.jpg','https://store.intcomex.com/Content/Images/noimage.jpg'])expect(urlFotoPermitida(url)).toBeNull();
 expect(urlFotoPermitida('/images/products/SKU-1.jpg')).toBe('https://store.intcomex.com/images/products/SKU-1.jpg');
});
test('descarga foto comprobada y tolera proveedor caído',async()=>{
 const original=globalThis.fetch;
 const bytes=await readFile('public/imagenes/logo-principal.png');
 const urls:string[]=[];
 try{
  globalThis.fetch=async(input,options)=>{const url=String(input);urls.push(url);expect(options?.redirect).toBe('error');
   if(url.includes('ByKeyword'))return new Response(listado);
   if(url.includes('Detail'))return new Response('<img class="ws_images_style" src="https://cdn.cs.1worldsync.com/foto.png">');
   return new Response(bytes,{headers:{'content-type':'image/png'}});
  };
  const foto=await buscarFotoIntcomex('SKU-1','MPN-1');
  expect(foto?.fuente).toBe('https://store.intcomex.com/es-XCR/Product/Detail/123');
  expect(foto?.bytes.equals(bytes)).toBeTruthy();expect(urls).toHaveLength(3);
  globalThis.fetch=async()=>new Response('unavailable',{status:503});
  expect(await buscarFotoIntcomex('SKU-1','MPN-1')).toBeNull();
 }finally{globalThis.fetch=original;}
});
