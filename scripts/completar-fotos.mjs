import {readFile,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
const mapa=JSON.parse(await readFile('scripts/fotos-intcomex.json','utf8'));
const fichas={'GY51S61915':636921,'GY51S61921':636923,'GXD1Q65145':636910,'GY50Z18991':547712,'ZG38C05190':636924,'83TD0039GJ':638520,'21R2S4EB00':642868,'83TD003AGJ':638521,'21QL006DFJ':627485,'82XM016KGJ':636376,'82XM016JGJ':636368,'13GN0049FJ':642525,'21Q6005RFJ':627486,'82XQ014LGJ':647201,'12RQ003HFJ':636631,'12RQ003JFJ':636627,'4X40T84059':399073};
for(const [mpn,id] of Object.entries(fichas)){
 const url=`https://store.intcomex.com/es-XCR/Product/Detail/${id}`;
 const html=await (await fetch(url,{signal:AbortSignal.timeout(15000)})).text();
 const tag=html.match(/<img[^>]*ws_images_style[^>]*>/)?.[0];
 const src=tag?.match(/src="([^"]+)"/)?.[1];
 if(src&&!/noimage|no-image|notfound/i.test(src))mapa[mpn]=new URL(src,url).href;
}
const validos={};
for(const [mpn,url] of Object.entries(mapa)){
 try{const r=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error();const m=await sharp(Buffer.from(await r.arrayBuffer())).metadata();if(!m.width||m.width<80)throw new Error();validos[mpn]=url;}catch{console.log('Foto pendiente:',mpn);}
}
await writeFile('scripts/fotos-intcomex.json',JSON.stringify(validos,null,2)+'\n');
for(const archivo of ['src/lib/catalogo-base.json','src/lib/catalogo-inicial.json']){
 const c=JSON.parse(await readFile(archivo,'utf8'));let cambios=0;
 for(const p of c.productos)if(p.imagen==='/imagenes/producto-sin-imagen.svg'&&validos[p.codigoFabricante]){p.imagen=validos[p.codigoFabricante];cambios++;}
 await writeFile(archivo,JSON.stringify(c,null,2)+'\n');
 console.log(archivo,{completadas:cambios,pendientes:c.productos.filter(p=>p.imagen.includes('sin-imagen')).map(p=>p.codigoFabricante)});
}
