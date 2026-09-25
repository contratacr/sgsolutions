import {imageSize} from 'image-size';
const origen='https://store.intcomex.com';
const dominios=new Set(['store.intcomex.com','intcomexpim.blob.core.windows.net','cdn.cs.1worldsync.com']);
export function urlFotoPermitida(valor:string){try{const u=new URL(valor,origen);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&dominios.has(u.hostname)&&!/noimage|no-image|placeholder|sin-imagen/i.test(u.pathname)?u.href:null;}catch{return null;}}
const limpiar=(s:string)=>s.replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').trim().toUpperCase();
export function coincidenciasFoto(html:string,sku:string,mpn:string){
 const encontrados:{id:string;sku:string}[]=[];
 for(const bloque of html.split(/<div id="row_\d+"/).slice(1)){
  const id=bloque.match(/\/Product\/Detail\/(\d+)/)?.[1];
  const codigo=bloque.match(/SKU:<\/span>(?:\s|&nbsp;)*<span[^>]*>([^<]+)<\/span>/)?.[1];
  const modelo=bloque.match(/MPN:<\/span>(?:\s|&nbsp;)*<span[^>]*>([^<]+)<\/span>/)?.[1];
  if(id&&codigo&&((sku&&limpiar(codigo)===sku.toUpperCase())||(mpn&&modelo&&limpiar(modelo)===mpn.toUpperCase())))encontrados.push({id,sku:limpiar(codigo)});
 }
 return encontrados;
}
export function fotoDelListado(html:string,id:string){
 const bloque=html.split(/<div id="row_/).find(b=>b.startsWith(`${id}"`));
 const tag=bloque?.match(/<img[^>]*class=['"][^'"]*img-products-ws-grid[^'"]*['"][^>]*>/)?.[0];
 const src=tag?.match(/src=['"]([^'"]+)['"]/)?.[1]?.replace(/&amp;/g,'&');
 return src?urlFotoPermitida(src):null;
}
async function descargar(url:string,maximo:number,signal:AbortSignal){
 const r=await fetch(url,{signal,redirect:'error',headers:{'User-Agent':'SGSolutions catalog image importer'},cache:'no-store'});
 if(!r.ok||Number(r.headers.get('content-length')??0)>maximo||!r.body)throw new Error('DESCARGA');
 const reader=r.body.getReader();const partes:Uint8Array[]=[];let total=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>maximo)throw new Error('LIMITE');partes.push(value);}}finally{await reader.cancel();}
 return Buffer.concat(partes);
}
export async function buscarFotoIntcomex(sku:string,mpn:string){
 const signal=AbortSignal.timeout(18000);
 for(const termino of [...new Set([sku,mpn].filter(Boolean))]){
  try{
   const html=(await descargar(`${origen}/es-XCR/Products/ByKeyword?term=${encodeURIComponent(termino)}`,1500000,signal)).toString('utf8');
   const matches=coincidenciasFoto(html,sku,mpn);if(matches.length!==1)continue;
   const producto=matches[0];const fuente=`${origen}/es-XCR/Product/Detail/${producto.id}`;
   let detalle='';
   try{detalle=(await descargar(fuente,1500000,signal)).toString('utf8');}catch{/* The exact matched listing may already contain the supplier image. */}
   const tag=detalle.match(/<img[^>]*ws_images_style[^>]*>/)?.[0];
   const src=tag?.match(/src=["']([^"']+)["']/)?.[1]?.replace(/&amp;/g,'&');
   const urls=[src,fotoDelListado(html,producto.id),`${origen}/images/products/${encodeURIComponent(producto.sku)}%20M.jpg`,`${origen}/images/products/${encodeURIComponent(producto.sku)}%20M.png`];
   for(const posible of urls){
    const url=posible&&urlFotoPermitida(posible);if(!url)continue;
    try{const bytes=await descargar(url,4*1024*1024,signal);const m=imageSize(bytes);
     // Intcomex serves genuine catalog thumbnails at 200 × 150 pixels.
     if(!m.width||!m.height||Math.min(m.width,m.height)<150||m.width*m.height>40000000||!['jpg','png','webp'].includes(m.type??''))continue;
     return {bytes,tipo:m.type==='jpg'?'image/jpeg':`image/${m.type}`,fuente};
    }catch{/* Continue only with another verified supplier image. */}
   }
  }catch{/* An unavailable supplier must not block the price import. */}
 }
 return null;
}
