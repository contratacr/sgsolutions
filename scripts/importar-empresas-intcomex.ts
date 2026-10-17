import {completarFichaEmpresarial} from '../src/lib/fichas-empresariales';
/** Import only exact SKU matches captured from the authenticated Intcomex storefront.
 * Raw supplier costs stay in the private source file; the deployable snapshot contains sale prices only.
 * Usage: npx tsx scripts/importar-empresas-intcomex.ts .privado/.../consulta-actual.json
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import sharp from 'sharp';
import seleccion from '../src/lib/seleccion-empresarial.json';
import {calcularPrecio,politicaPrecios,esquemaCatalogo,type CatalogoAdmin} from '../src/lib/catalogo-modelo';
import base from '../src/lib/catalogo-base.json';
type Card={name:string;brand:string;price:string;currency:string;image:string;href:string;meta:{label:string;value:string}[]};
type Consulta={sku:string;at:string;cards:Card[]};
async function main(){
const fuente=process.argv[2];if(!fuente?.startsWith('.privado/'))throw new Error('Se requiere evidencia privada de consulta');
const consultas:Consulta[]=JSON.parse(await readFile(fuente,'utf8'));
const anteriores=esquemaCatalogo.parse({...base,productos:JSON.parse(await readFile('src/lib/catalogo-empresarial.json','utf8'))}).productos;
const porSku=new Map(anteriores.map(p=>[p.codigoIntcomex,p]));
const categorias:Record<string,string>={redes:'redes',seguridad:'seguridad',respaldo:'almacenamiento',infraestructura:'computadoras',energia:'energia'};
const tipos:[RegExp,string,string][]=[
 [/camera mount/i,'Soporte para cámara','Camera mount'],[/junction box/i,'Caja de conexiones','Junction box'],[/power injector|inyector/i,'Inyector PoE','PoE injector'],[/antenna|antena/i,'Antena','Antenna'],[/transceiver|transceptor|optical module/i,'Módulo de red','Network module'],[/convertidor/i,'Convertidor de fibra a Ethernet','Fiber to Ethernet converter'],[/smart chime|doorbell/i,'Timbre','Doorbell'],[/access control|control de acceso|lectora de tarjetas|door access/i,'Control de acceso','Access control'],[/\bNVR\b|video recorder/i,'Grabador NVR','NVR recorder'],[/\bNAS\b/i,'Servidor NAS','NAS server'],[/camera|cámara|camara|turret|bullet|fisheye/i,'Cámara de vigilancia','Surveillance camera'],[/notebook|portátil|14in/i,'Computadora portátil','Laptop'],[/all-in-one/i,'Computadora todo en uno','All-in-one computer'],[/\bserver\b|servidor/i,'Servidor','Server'],[/mouse/i,'Mouse','Mouse'],[/fan customer/i,'Kit de ventilador','Fan kit'],[/docking station/i,'Estación de acoplamiento','Docking station'],[/kit de montaje/i,'Kit de montaje','Mounting kit'],[/juego de rieles/i,'Rieles para rack','Rack rails'],[/battery backup|\bUPS\b/i,'Respaldo de energía','Battery backup'],[/switch|conmutador/i,'Switch','Switch'],[/wireless access point|punto de acceso/i,'Punto de acceso','Access point'],[/bridge|puente inalámbrico/i,'Puente inalámbrico','Wireless bridge'],[/router|gateway|pasarela|gestión de la red/i,'Router y gateway','Router and gateway'],[/cable|par trenzado/i,'Cable de red','Network cable'],[/expansion module/i,'Módulo de expansión','Expansion module'],[/power distri/i,'Distribución de energía','Power distribution'],[/intel core/i,'Computadora','Computer']];
const pendientes:string[]=[],sinImagen:string[]=[];
const productos:CatalogoAdmin['productos']=[];
await mkdir('public/imagenes/empresas-intcomex',{recursive:true});
for(const [sku,solucion] of Object.entries(seleccion)){
 const consulta=consultas.find(c=>c.sku===sku);
 const coincidencias=consulta?.cards.filter(c=>c.meta.some(m=>m.label==='SKU'&&m.value===sku))??[];
 if(coincidencias.length!==1){pendientes.push(sku);const anterior=porSku.get(sku);if(anterior)productos.push(anterior);continue;}
 const c=coincidencias[0],costo=Number(c.price.replace(/,/g,''));
 if(c.currency!=='USD'||!Number.isFinite(costo)||costo<=0)throw new Error(`Costo inválido: ${sku}`);
 const mpn=c.meta.find(m=>m.label==='MPN')?.value?.trim();if(!mpn)throw new Error(`MPN ausente: ${sku}`);
 const previo=porSku.get(sku);const anterior=previo?.codigoFabricante.toUpperCase().replace(/\s+/g,'')===mpn.toUpperCase().replace(/\s+/g,'')?previo:undefined;
 const tipo=tipos.find(([re])=>re.test(c.name));
 const nEs=tipo?.[1]??'Equipo',nEn=tipo?.[2]??'Equipment';
 const marca=c.brand==='Marca Genérica'&&/^Dell\b/i.test(c.name)?'Dell':c.brand;
 const identidad=`${marca} ${mpn}`.trim();
 const capacidad=c.name.match(/\b\d+(?:[.,]\d+)?\s*VA\b/i)?.[0];
 const cpu=c.name.match(/Intel (?:Core|Xeon)[^-–]+?(?=\s\/|\s-\s|$)/)?.[0]?.trim();
 const titulo={es:`${nEs} ${identidad}${capacidad?` · ${capacidad}`:''}`,en:`${nEn} ${identidad}${capacidad?` · ${capacidad}`:''}`};
 const especificaciones=[{nombre:{es:'Modelo',en:'Model'},valor:{es:mpn,en:mpn}}];
 if(capacidad)especificaciones.push({nombre:{es:'Capacidad',en:'Capacity'},valor:{es:capacidad,en:capacidad}});
 if(cpu)especificaciones.push({nombre:{es:'Procesador',en:'Processor'},valor:{es:cpu,en:cpu}});
 const vatios=c.name.match(/\b(\d+(?:[.,]\d+)?)\s*(?:Watt|vatios)\b/i)?.[1];if(vatios)especificaciones.push({nombre:{es:'Potencia',en:'Power'},valor:{es:`${vatios} W`,en:`${vatios} W`}});
 const instalacion=/DEBE COMPRAR SERVICIO DE INSTALACI[ÓO]N/i.test(c.name);
 const imagen=anterior?.imagen??`/imagenes/empresas-intcomex/${sku.toLowerCase()}.webp`;
 productos.push({id:`empresa-intcomex-${sku.toLowerCase()}`,slug:anterior?.slug,coleccion:'empresas',solucionEmpresarial:solucion as NonNullable<CatalogoAdmin['productos'][number]['solucionEmpresarial']>,categoria:categorias[solucion],nombre:titulo,descripcion:{es:`${titulo.es}. Le ayudamos a confirmar disponibilidad y compatibilidad antes de preparar su enlace de compra.${instalacion?' Este equipo requiere contratar el servicio de instalación.':''}`,en:`${titulo.en}. We help you confirm availability and compatibility before preparing your purchase link.${instalacion?' This equipment requires purchasing the installation service.':''}`},imagen,imagenes:anterior?.imagenes??[],fichaTecnica:anterior?.fichaTecnica,especificaciones,marca:marca||c.brand,codigoFabricante:mpn,codigoIntcomex:sku,estadoIntcomex:{estado:'encontrado',fecha:consulta!.at},inventarioPropio:false,costoUsd:null,costoCrc:null,precioReferencia:calcularPrecio(costo,politicaPrecios),disponibilidadReferencia:'consultar',revisionPrecio:false,precioManual:null,publicado:true,destacado:false});
}
let cursor=0;await Promise.all(Array.from({length:6},async()=>{while(cursor<productos.length){const p=productos[cursor++];try{await readFile(`public${p.imagen}`);continue;}catch{}const c=consultas.find(x=>x.sku===p.codigoIntcomex)?.cards.find(c=>c.meta.some(m=>m.label==='SKU'&&m.value===p.codigoIntcomex));try{if(!c)throw new Error('Consulta incompleta');const url=new URL(c.image);if(!['cdn.cs.1worldsync.com','intcomexpim.blob.core.windows.net','skucentral-experience-api-prod.us-e1.cloudhub.io'].includes(url.hostname))throw new Error('Imagen no reconocida');const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error('Imagen no disponible');const bytes=await r.arrayBuffer();await sharp(Buffer.from(bytes)).resize({width:640,height:640,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toFile(`public${p.imagen}`);}catch{sinImagen.push(p.codigoIntcomex!);p.imagen='/imagenes/producto-sin-imagen.svg';}}}));
const validado=esquemaCatalogo.parse({...base,productos:productos.map(completarFichaEmpresarial)});
await writeFile('src/lib/modelos-exclusivos-empresas.json',JSON.stringify([...new Set(validado.productos.map(p=>p.marca.trim().toUpperCase()+'|'+p.codigoFabricante.toUpperCase().replace(/\s+/g,'')))].sort(),null,2)+'\n');
await writeFile('src/lib/catalogo-empresarial.json',JSON.stringify(validado.productos,null,2)+'\n');
await writeFile(fuente.replace(/\.json$/, '-informe.json'),JSON.stringify({fecha:new Date().toISOString(),politica:politicaPrecios,seleccion:Object.keys(seleccion).length,publicados:productos.length,pendientes,sinImagen},null,2)+'\n');
console.log({publicados:productos.length,pendientes,sinImagen});

}
main().catch(error=>{console.error(error);process.exitCode=1;});
