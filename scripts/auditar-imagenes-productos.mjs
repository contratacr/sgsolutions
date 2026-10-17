/** Read-only public catalogue audit. No stock/price changes or automatic image guesses. */
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
const base=new URL(process.env.SG_CATALOGO_URL??'http://127.0.0.1:3140');
const primera=await fetch(new URL('/api/catalogo',base)).then(r=>{if(!r.ok)throw Error(`Catálogo HTTP ${r.status}`);return r.json();});
const productos=[...primera.productos];
for(let desde=2;desde<=primera.paginas;desde+=8){
 const paginas=await Promise.all(Array.from({length:Math.min(8,primera.paginas-desde+1)},async(_,i)=>{
  const pagina=desde+i;
  const r=await fetch(new URL(`/api/catalogo?pagina=${pagina}`,base));if(!r.ok)throw Error(`Página ${pagina}: ${r.status}`);
  return r.json();
 }));
 for(const pagina of paginas)productos.push(...pagina.productos);
}
const urls=[...new Set(productos.flatMap(p=>[p.imagen,...(p.imagenes??[])]))];
console.log(`Revisando ${productos.length} productos y ${urls.length} imágenes.`);
const previos=process.argv.includes('--usar-descargas-previas')?JSON.parse(await readFile('.privado/auditoria-imagenes/resultados.json','utf8')):[];
const descargadas=new Map(previos.filter(p=>p.estado==='correcta').map(p=>[p.url,p.path]));
const resultados=[];let indice=0;
await Promise.all(Array.from({length:8},async()=>{while(indice<urls.length){
 const url=urls[indice++];let error=null;
 try{
  if(!url||url.includes('producto-sin-imagen'))throw Error('Imagen pendiente');
  let bytes;
  if(url.startsWith('/imagenes/')&&!url.includes('..'))bytes=await readFile(new URL('../public'+url,import.meta.url));
  else if(descargadas.has(url))bytes=await readFile(descargadas.get(url));
  else{
   const destino=new URL(url);if(destino.protocol!=='https:')throw Error('URL no segura');
   const r=await fetch(destino,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error(`HTTP ${r.status}`);
   const chunks=[];let total=0;for await(const chunk of r.body){total+=chunk.length;if(total>15_000_000)throw Error('Imagen demasiado grande');chunks.push(chunk);}bytes=Buffer.concat(chunks);
  }
  const meta=await sharp(bytes).metadata();if(!meta.width||!meta.height||meta.width<40||meta.height<40)throw Error('Imagen no válida');
 }catch(e){error=e.message;}
 if((resultados.length+1)%100===0)console.log(`${resultados.length+1}/${urls.length}`);
 resultados.push({url,error,productos:productos.filter(p=>p.imagen===url||p.imagenes?.includes(url)).map(p=>({id:p.id,marca:p.marca,mpn:p.codigoFabricante}))});
}}));
await mkdir('.privado/auditoria-imagenes',{recursive:true});
await writeFile('.privado/auditoria-imagenes/ultima-validacion.json',JSON.stringify({fecha:new Date().toISOString(),usaDescargasPrevias:process.argv.includes('--usar-descargas-previas'),total:productos.length,resultados},null,2));
const fallos=resultados.filter(r=>r.error);console.log(JSON.stringify({productos:productos.length,imagenes:urls.length,fallos},null,2));
if(process.argv.includes('--registrar-fallos')){
 const ruta=new URL('../src/lib/imagenes-productos-invalidas.json',import.meta.url);
 const anteriores=JSON.parse(await readFile(ruta,'utf8'));
 await writeFile(ruta,JSON.stringify([...new Set([...anteriores,...fallos.map(f=>f.url)])],null,2)+'\n');
}
process.exitCode=fallos.length?1:0;
