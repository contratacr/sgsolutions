import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {esquemaCatalogo,publicarCatalogo} from '../src/lib/catalogo-modelo.ts';
import {consultarIws,type CredencialesIws} from '../src/lib/intcomex/cliente.ts';
import {combinarIws,fusionarProveedor,esquemaFilaProveedor} from '../src/lib/intcomex/catalogo.ts';

const archivo=process.argv.find(a=>a.startsWith('--archivo='))?.slice(10);
const aplicar=process.argv.includes('--aplicar');
const local=process.argv.includes('--local');
const inventario=process.argv.includes('--inventario');
const fecha=new Date().toISOString();
async function ejecutar(){
 const credenciales:CredencialesIws={apiKey:process.env.INTCOMEX_API_KEY??'',accessKey:process.env.INTCOMEX_ACCESS_KEY??'',ambiente:process.env.INTCOMEX_AMBIENTE==='produccion'?'produccion':'test'};
 if(!archivo&&(!credenciales.apiKey||!credenciales.accessKey))throw new Error('IWS_SIN_CREDENCIALES');
 if(inventario&&(archivo||local))throw new Error('MODO_INVALIDO');
 const url=process.env.SUPABASE_URL,llave=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!local&&(!url||!llave))throw new Error('SUPABASE_SIN_CONFIGURAR');
 if(url&&!url.startsWith('https://')&&!url.startsWith('http://127.0.0.1:'))throw new Error('SUPABASE_URL_INVALIDA');
 const db=!local?createClient(url!,llave!,{auth:{persistSession:false,autoRefreshToken:false}}):null;
 let actual,revision=0;
 if(db){const {data,error}=await db.from('catalogo_privado').select('contenido,revision').eq('id',1).maybeSingle();if(error)throw new Error('CATALOGO_LECTURA');actual=data?.contenido;revision=data?.revision??0;}
 if(!actual)actual=JSON.parse(await readFile(local?'src/lib/catalogo-inicial.json':'src/lib/catalogo-base.json','utf8'));
 const base=esquemaCatalogo.parse(actual);
 let resultado;
 if(inventario){
  const datos=await consultarIws(credenciales,'getinventory');
  // Reutilizar los validadores y las reglas de ESD del importador.
  const filas=combinarIws(base.productos.filter(p=>p.proveedor).map(p=>({Sku:p.proveedor!.sku,Mpn:p.codigoFabricante,Brand:{Description:p.marca},Description:p.nombre.es,Category:{CategoryId:({computo:'cpt',redes:'net',seguridad:'vis',accesorios:'cac',oficina:'prt','punto-de-venta':'pos',software:'sfw',gaming:'gam',componentes:'cco'} as Record<string,string>)[p.categoria]},Type:p.proveedor!.tipo})),base.productos.filter(p=>p.proveedor).map(p=>({Sku:p.proveedor!.sku,Brand:{Description:p.marca},Description:p.nombre.en})),base.productos.filter(p=>p.proveedor).map(p=>({Sku:p.proveedor!.sku,Price:{UnitPrice:p.proveedor!.costo,CurrencyId:p.proveedor!.moneda}})),datos).filas;
  const stock=new Map(filas.map(f=>[f.sku,f]));
  let actualizados=0;
  for(const p of base.productos){const f=p.proveedor&&stock.get(p.proveedor.sku);if(f&&p.proveedor){p.proveedor={...p.proveedor,stock:f.stock,stockExacto:f.stockExacto,actualizado:fecha};actualizados++;}}
  resultado={catalogo:base,informe:{actualizados,modo:'inventario'}};
 }else{
  let filas;
  if(archivo){const datos=JSON.parse(await readFile(archivo,'utf8'));if(!Array.isArray(datos)||!datos.length)throw new Error('ARCHIVO_INVALIDO');filas=datos.map(d=>esquemaFilaProveedor.parse(d));}
  else{
   const [es,en,precios,stock]=await Promise.all([consultarIws(credenciales,'getcatalog','es'),consultarIws(credenciales,'getcatalog','en'),consultarIws(credenciales,'getpricelist'),consultarIws(credenciales,'getinventory')]);
   const datos=combinarIws(es,en,precios,stock);filas=datos.filas;
   console.log(JSON.stringify({recibidos:es.length,aptos:filas.length,omitidos:datos.omitidos.length}));
  }
  if(!filas.length)throw new Error('SIN_PRODUCTOS_VALIDOS');
  resultado=fusionarProveedor(base,filas,fecha);
  if(!archivo){const presentes=new Set(filas.map(f=>f.sku));for(const p of resultado.catalogo.productos)if(p.proveedor&&!presentes.has(p.proveedor.sku)){p.revisionPrecio=true;p.proveedor.stock=null;}}
 }
 console.log(JSON.stringify({fecha,aplicar,...resultado.informe}));
 if(!aplicar)return;
 if(db){const {error}=await db.rpc('sincronizar_catalogo',{privado:resultado.catalogo,visible:publicarCatalogo(resultado.catalogo),revision_esperada:revision});if(error)throw new Error(error.message.includes('CONFLICTO')?'CONFLICTO_REINTENTAR':'CATALOGO_GUARDADO');}
 else{
  await mkdir('.privado/intcomex',{recursive:true});
  await writeFile(`.privado/intcomex/respaldo-${Date.now()}.json`,JSON.stringify(base),{mode:0o600});
  await writeFile('src/lib/catalogo-inicial.json',JSON.stringify(resultado.catalogo,null,2)+'\n',{mode:0o600});
  // Instantánea para builds de prueba: solo precios de venta, sin datos mayoristas.
  const publico=publicarCatalogo(resultado.catalogo);
  const seguro={...resultado.catalogo,productos:resultado.catalogo.productos.map(p=>{const venta=publico.productos.find(x=>x.id===p.id);const {proveedor:privado,...resto}=p;void privado;return {...resto,costoUsd:null,costoCrc:null,precioReferencia:venta?.precio??null,disponibilidadReferencia:venta?.disponibilidad??'consultar'};})};
  await writeFile('src/lib/catalogo-base.json',JSON.stringify(seguro,null,2)+'\n');
 }
}
ejecutar().catch(error=>{
 // Nunca registrar respuestas del proveedor, URLs firmadas ni costos.
 console.error(error instanceof Error&&/^[A-Z_0-9]+$/.test(error.message)?error.message:'SINCRONIZACION_FALLIDA');process.exitCode=1;
});
