import 'server-only';
import {incorporarSoftware} from './incorporar-software';
import {esProductoSoftware,limiteCantidadProducto} from './software';
import {preciosProducto} from './catalogo-modelo';
import {servicioPruebas} from './servicio-pruebas';
import {consultarEurocomp,ErrorEurocomp} from './eurocomp-protocolo';
import {precioVentaEurocomp,stockVendibleEurocomp} from './eurocomp-politica';
import inicial from './catalogo-inicial.json';
import {leerLocal} from './admin-local';
import {createClient} from '@supabase/supabase-js';
import {esquemaCatalogo,aplicarDescuento} from './catalogo-modelo';
import type {CatalogoPublico} from './catalogo-modelo';

// Serialize calls: SiReTT warns against simultaneous supplier requests.
let cola=Promise.resolve();
async function consultar(codigo:string,vence:number){
 const anterior=cola;let liberar!:()=>void;cola=new Promise<void>(r=>{liberar=r;});await anterior;
 try{
  const restante=vence-Date.now();if(restante<=0)throw new ErrorEurocomp('tiempo');
  const clave=process.env.EUROCOMP_API_KEY||process.env.EUROCOMP_PASSWORD||'';
  const id=process.env.EUROCOMP_API_KEY?'0':process.env.EUROCOMP_WEB_SERVICE_ID||'';
  const bodega=Number(process.env.EUROCOMP_BODEGA_ID??'0');
  const destino=servicioPruebas('eurocomp');
  const datos=await consultarEurocomp({id,clave,bodega,codigo,tiempoMaximo:Math.min(10_000,restante)},destino?(_url,opciones)=>fetch(destino,opciones):fetch);return datos.articulos.find(a=>a.codigo===codigo)??null;
 }finally{liberar();}
}
export async function verificarCompraEurocomp(articulos:{producto:CatalogoPublico['productos'][number];cantidad:number}[]){
 const local=await leerLocal<typeof inicial>('catalogo');
 let privado=local?esquemaCatalogo.parse(local.contenido):undefined;
 let ajustes=local?.contenido.ajustes??inicial.ajustes;
 const url=process.env.SUPABASE_URL,llave=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!local&&url&&llave){
  if(process.env.SG_ENTORNO==='local'&&!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new ErrorEurocomp('configuracion');
  const db=createClient(url,llave,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await db.from('catalogo_privado').select('contenido').eq('id',1).single();
  if(error||!data)throw new ErrorEurocomp('almacenamiento');privado=esquemaCatalogo.parse(data.contenido);ajustes=privado.ajustes;
 }
 privado=incorporarSoftware(privado??esquemaCatalogo.parse(inicial));
 const {cambio,utilidad,iva,adicional}=ajustes;const vence=Date.now()+20_000;
 for(const {producto,cantidad} of articulos){
  if(esProductoSoftware(producto)){
   const actual=privado.productos.find(p=>p.id===producto.id&&esProductoSoftware(p));
   if(!actual?.publicado||actual.disponibilidadReferencia==='agotado'||cantidad<1||!Number.isInteger(cantidad)||cantidad>limiteCantidadProducto(producto.id)||preciosProducto(actual,ajustes).precio!==producto.precio)throw new ErrorEurocomp('catalogo_actualizado');
   continue;
  }
  if(!producto.codigoEurocomp)continue;
  const actual=await consultar(producto.codigoEurocomp,vence);
  if(!actual||!stockVendibleEurocomp(actual.stock,cantidad)||actual.precio===null||precioVentaEurocomp(actual.precio,actual.moneda,cambio,utilidad,iva,adicional)!==(producto.precioOriginal??producto.precio))throw new ErrorEurocomp('catalogo_actualizado');
  const base=precioVentaEurocomp(actual.precio,actual.moneda,cambio,utilidad,iva,adicional);
  const esperado=aplicarDescuento(base,privado.productos.find(p=>p.id===producto.id)?.precioDescuento);
  if(esperado.precio!==producto.precio)throw new ErrorEurocomp('catalogo_actualizado');
 }
}
