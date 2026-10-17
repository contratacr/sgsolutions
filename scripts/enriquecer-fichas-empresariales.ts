import {readFile,writeFile} from 'node:fs/promises';
import {esquemaCatalogo,type CatalogoAdmin} from '../src/lib/catalogo-modelo';
import etiquetas from '../src/lib/intcomex-etiquetas.json';
import fabricante from '../src/lib/fichas-empresariales-fabricante.json';
import base from '../src/lib/catalogo-base.json';
type Producto=CatalogoAdmin['productos'][number];
type Fila={nombre?:string;valor?:string};
type Fuente={sku:string;mpn:string;titulo:string;idioma:string;filas:Fila[];fuente:string;consultado:string};
async function main(){
const carpeta=process.argv[2];if(!carpeta?.startsWith('.privado/'))throw new Error('Se requiere evidencia local de las fichas públicas');
const productos:Producto[]=JSON.parse(await readFile('src/lib/catalogo-empresarial.json','utf8'));
const mapa=etiquetas as Record<string,string>;
const limpiar=(s:string)=>s.replace(/Á\u0081ngulo/g,'Ángulo').replace(/[\u0000-\u001f\u007f-\u009f]/g,' ').replace(/\s+/g,' ').trim();
const identidad=(s:string)=>s.toUpperCase().replace(/\s+/g,'');
const fichas=[],pendientes=[],sinTraduccion=new Set<string>();
for(const p of productos){
 const es:Fuente=JSON.parse(await readFile(`${carpeta}/${p.codigoIntcomex}-es.json`,'utf8'));
 const en:Fuente=JSON.parse(await readFile(`${carpeta}/${p.codigoIntcomex}-en.json`,'utf8'));
 if([es,en].some(x=>x.sku!==p.codigoIntcomex||identidad(x.mpn)!==identidad(p.codigoFabricante)))throw new Error(`Identidad incompatible: ${p.codigoIntcomex}`);
 const ingles=new Map<string,Fila[]>();for(const x of en.filas){if(!x.nombre||!x.valor)continue;const key=limpiar(x.nombre);ingles.set(key,[...(ingles.get(key)??[]),x]);}
 const especificaciones:Producto['especificaciones']=[{nombre:{es:'Modelo',en:'Model'},valor:{es:p.codigoFabricante,en:p.codigoFabricante}}];
 const originales:Producto['especificaciones']=[];
 for(const x of es.filas){
  if(!x.nombre?.includes('>')||!x.valor)continue;
  const key=x.nombre.replace(/\s+/g,' ').trim(),traducido=mapa[key];
  if(!traducido){sinTraduccion.add(key);continue;}
  const disponibles=ingles.get(traducido)??[],igual=disponibles.find(y=>limpiar(y.valor??'').toLowerCase()===limpiar(x.valor!).toLowerCase())??disponibles[0];
  if(!igual?.valor)continue;disponibles.splice(disponibles.indexOf(igual),1);
  const dato={nombre:{es:limpiar(key),en:limpiar(traducido)},valor:{es:limpiar(x.valor),en:limpiar(igual.valor)}};
  if(!originales.some(y=>JSON.stringify(y)===JSON.stringify(dato)))originales.push(dato);
 }
 // Supplement sparse supplier tables only with facts explicitly present in the exact SKU title.
 const agregar=(nombre:{es:string;en:string},valor:{es:string;en:string})=>{if(!originales.some(x=>x.nombre.en===nombre.en))originales.push({nombre,valor});};
 const titulo=es.titulo;
 const potencia=titulo.match(/\b(\d+(?:[.,]\d+)?)\s*(?:vatios|Watt|W)\b/i)?.[1];if(potencia)agregar({es:'Dispositivo de alimentación > Potencia suministrada',en:'Power Device > Power Provided'},{es:`${potencia} W`,en:`${potencia} W`});
 const va=titulo.match(/\b(\d+(?:[.,]\d+)?)\s*VA\b/i)?.[1];if(va)agregar({es:'Dispositivo de alimentación > Capacidad energética (VA)',en:'Power Device > Power Capacity (VA)'},{es:`${va} VA`,en:`${va} VA`});
 const mp=titulo.match(/\b(\d+(?:[.,]\d+)?)\s*MP\b/i)?.[1];if(mp)agregar({es:'Cámara digital > Resolución (MP)',en:'Digital Camera > Resolution (MP)'},{es:`${mp} MP`,en:`${mp} MP`});
 const gbps=titulo.match(/\b(\d+(?:[.,]\d+)?)\s*Gbps\b/i)?.[1];if(gbps)agregar({es:'Conexión de redes > Velocidad de transferencia',en:'Networking > Data Transfer Rate'},{es:`${gbps} Gbps`,en:`${gbps} Gbps`});
 const cat=titulo.match(/\bCat[ -]?([5-8][ae]?)\b/i)?.[1];if(cat)agregar({es:'Cable > Categoría',en:'Cable > Category'},{es:`Cat ${cat}`,en:`Cat ${cat}`});
 if(/single.mode/i.test(titulo))agregar({es:'Conexión de redes > Tipo de fibra',en:'Networking > Fiber Type'},{es:'Monomodo',en:'Single-mode'});
 if(/\bPoE\+?\b/i.test(titulo))agregar({es:'Conexión de redes > Alimentación por Ethernet (PoE)',en:'Networking > Power Over Ethernet (PoE)'},{es:titulo.match(/PoE\+\+|PoE\+|PoE/i)![0],en:titulo.match(/PoE\+\+|PoE\+|PoE/i)![0]});
 if(p.solucionEmpresarial==='infraestructura'){
  const cpu=titulo.match(/(?:Intel\s+(?:Core|Xeon)[^-–/]+|AMD\s+Ryzen[^-–/]+)/i)?.[0]?.trim();if(cpu)agregar({es:'Procesador > Tipo',en:'Processor > Type'},{es:cpu,en:cpu});
  const ram=titulo.match(/\b(\d+)\s*GB\s*(?:-\s*)?(?:RAM|DDR[345])/i)?.[1];if(ram)agregar({es:'Memoria RAM > Tamaño instalado',en:'RAM > Installed Size'},{es:`${ram} GB`,en:`${ram} GB`});
  const disco=titulo.match(/\b(\d+(?:[.,]\d+)?)\s*(TB|GB)\s*(?:SSD|HDD|Hard Drive Capacity)/i);if(disco)agregar({es:'Sistema > Capacidad del disco duro',en:'System > Hard Drive Capacity'},{es:`${disco[1]} ${disco[2].toUpperCase()}`,en:`${disco[1]} ${disco[2].toUpperCase()}`});
  const pantalla=titulo.match(/\b(\d+(?:[.,]\d+)?)\s*(?:"|in\b|pulgadas?\b)/i)?.[1];if(pantalla)agregar({es:'Pantalla > Tamaño en diagonal',en:'Display > Diagonal Size'},{es:`${pantalla} pulgadas`,en:`${pantalla} in`});
  const os=titulo.match(/(?:Microsoft\s+)?Windows\s+1[01]\s+(?:Pro|Home)/i)?.[0];if(os)agregar({es:'OS proporcionado > Tipo',en:'OS Provided > Type'},{es:os,en:os});
 }
 const oficial=(fabricante as Record<string,{mpn:string;fuente:string;especificaciones:Producto['especificaciones']}>)[p.codigoIntcomex!];
 if(oficial){if(identidad(oficial.mpn)!==identidad(p.codigoFabricante))throw new Error('Modelo del fabricante incompatible');for(const x of oficial.especificaciones)agregar(x.nombre,x.valor);}
 const prioridad=(s:string)=>/Processor > (Type|Processor Number)/.test(s)?1:/RAM > Installed Size/.test(s)?2:/Hard Drive Capacity|NAS|Storage > Type/.test(s)?3:/Display > Diagonal Size|Resolution \(MP\)/.test(s)?4:/Graphics Processor|Video Channels/.test(s)?5:/Power Provided|Power Capacity/.test(s)?6:/Ports Qty|Number of|Port Quantity|Data Transfer Rate/.test(s)?7:/OS Provided/.test(s)?8:/Warranty|Service & Support|Miscellaneous|Environmental|Shock/.test(s)?90:30;
 originales.sort((a,b)=>prioridad(a.nombre.en)-prioridad(b.nombre.en));
 especificaciones.push(...originales.slice(0,99));
 if(!originales.length)pendientes.push({sku:p.codigoIntcomex,motivo:'El proveedor no publicó características técnicas adicionales'});
 const dato=(exp:RegExp,l:'es'|'en')=>originales.find(x=>exp.test(x.nombre.en))?.valor[l];
 const detalles=(l:'es'|'en')=>{
  const cpuOriginal=dato(/Processor > Type/,l)??[dato(/Processor > Manufacturer/,l),dato(/Processor > Processor Number/,l)].filter(Boolean).join(' ');
  const cpu=cpuOriginal.replace(/Corteza/gi,'Cortex');
  const ram=dato(/^RAM > Installed Size$/,l),disco=dato(/Hard Drive Capacity/,l),pantalla=dato(/Display > Diagonal Size/,l);
  return [cpu,ram&&/\b[GMT]B\b/i.test(ram)?ram:undefined,disco,pantalla?.replace(/\s*(?:pulgadas?|inches?|in)\b/i,'"'),dato(/Digital Camera > Resolution/,l),dato(/Power Provided/,l)?.match(/\d.*(?:\bW\b|watt|vatios)/i)?.[0],dato(/Power Capacity/,l)?.match(/\d.*\bVA\b/i)?.[0]].filter((v):v is string=>Boolean(v)&&!/^\d+(?:[.,]\d+)?$/.test(v!)).slice(0,4);
 };
 const tipo:Record<string,{es:string;en:string}>={NW608UBQ09:{es:'Router y gateway',en:'Router and gateway'},NW001UBQ46:{es:'Llaveros de acceso',en:'Access key fobs'},ES001UBQ21:{es:'Adaptador de video en red',en:'Network video adapter'},ES001UBQ79:{es:'Panel frontal para grabador',en:'Recorder faceplate'},NW001UBQ94:{es:'Radio inalámbrico',en:'Wireless radio'},ES223HIK72:{es:'Cámara de vigilancia',en:'Surveillance camera'},NW501UBQ04:{es:'Equipo de red',en:'Networking equipment'},ES001UBQ55:{es:'Control de acceso empresarial',en:'Enterprise access controller'},ES402HIK83:{es:'Grabador NVR móvil',en:'Mobile NVR recorder'}};
 const n=tipo[p.codigoIntcomex!];
 const nombre={es:[n?`${n.es} ${p.marca} ${p.codigoFabricante}`:p.nombre.es.split(' · ')[0],...detalles('es')].join(' · '),en:[n?`${n.en} ${p.marca} ${p.codigoFabricante}`:p.nombre.en.split(' · ')[0],...detalles('en')].join(' · ')};
 const describir=(l:'es'|'en')=>[nombre[l]+'.',...originales.filter(x=>!(/Installed Size/.test(x.nombre.en)&&/^\d+(?:[.,]\d+)?$/.test(x.valor.en))).slice(0,5).map(x=>`${x.nombre[l].replace(' > ',' — ')}: ${x.valor[l]}.`),/requiere contratar el servicio de instalación/.test(p.descripcion.es)?(l==='es'?'Este equipo requiere contratar el servicio de instalación.':'This equipment requires purchasing the installation service.'):''].filter(Boolean).join(' ');
 fichas.push({sku:p.codigoIntcomex!,mpn:p.codigoFabricante,marca:p.marca,nombre,descripcion:{es:describir('es'),en:describir('en')},especificaciones,fuentes:{es:es.fuente,en:en.fuente},consultado:es.consultado,...(oficial?{fuenteFabricante:oficial.fuente}:{})});
}
if(sinTraduccion.size)throw new Error('Etiquetas sin traducción: '+[...sinTraduccion].join(', '));
await writeFile('src/lib/fichas-empresariales.json',JSON.stringify(fichas,null,2)+'\n');
const {completarFichaEmpresarial}=await import('../src/lib/fichas-empresariales');
const actualizado=esquemaCatalogo.parse({...base,productos:productos.map(completarFichaEmpresarial)});
await writeFile('src/lib/catalogo-empresarial.json',JSON.stringify(actualizado.productos,null,2)+'\n');
await writeFile(`${carpeta}/enriquecimiento-informe.json`,JSON.stringify({fichas:fichas.length,caracteristicas:fichas.reduce((n,f)=>n+f.especificaciones.length,0),pendientes},null,2));
console.log({fichas:fichas.length,caracteristicas:fichas.reduce((n,f)=>n+f.especificaciones.length,0),pendientes:pendientes.length});

}
main().catch(e=>{console.error(e);process.exitCode=1;});
