/** Checkout data stays in the current tab, never in persistent localStorage. */
export const DURACION_BORRADOR_COMPRA=30*60*1000;
export async function huellaCompra(texto:string){
 const valor=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(texto));
 return Array.from(new Uint8Array(valor),b=>b.toString(16).padStart(2,'0')).join('');
}
export async function huellaBorrador(texto:string|null){
 if(!texto)return null;const datos=JSON.parse(texto);delete datos.fecha;return huellaCompra(JSON.stringify(datos));
}
const prefijos=['sg-compra-borrador-v1:','sg-pago-pendiente-v1:'];
const esCompra=(clave:string)=>prefijos.some(p=>clave.startsWith(p));
export function limpiarBorradoresCompra(){
 for(const almacen of [()=>localStorage,()=>sessionStorage])try{const a=almacen();for(const k of Object.keys(a).filter(esCompra))a.removeItem(k);}catch{/* Storage can be blocked. */}
}
export function depurarBorradoresCompra(){
 // Do not migrate old persistent personal data into a new session.
 try{for(const k of Object.keys(localStorage).filter(esCompra))localStorage.removeItem(k);}catch{}
 try{for(const k of Object.keys(sessionStorage).filter(esCompra)){
  try{const d=JSON.parse(sessionStorage.getItem(k)||'null'),edad=Date.now()-d?.fecha;
   if(!Number.isFinite(edad)||edad<0||edad>=(k.startsWith(prefijos[0])?DURACION_BORRADOR_COMPRA:86400000))sessionStorage.removeItem(k);
  }catch{sessionStorage.removeItem(k);}
 }}catch{}
}
