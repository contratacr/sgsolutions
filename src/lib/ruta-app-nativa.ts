import {retornoCompra} from './retorno-compra';

const publicas=new Set(['/','/tienda','/favoritos','/soporte','/empresas','/casos-de-exito','/nosotros','/contacto','/terminos','/privacidad','/cuenta']);
/** Development scheme only. Never accepts an external origin, auth callback or API. */
export function rutaAppNativa(value:unknown):string|null{
 if(typeof value!=='string'||value.length>2048||/[\\\s]/.test(value))return null;
 try{
  const url=new URL(value);
  if(url.protocol!=='sgsolutions-dev:'||url.hostname!=='app'||url.port||url.username||url.password||url.hash)return null;
  if(url.pathname.includes('%')||url.pathname.includes('//'))return null;
  if(['/pagar','/finalizar-compra'].includes(url.pathname))return retornoCompra(url.pathname+url.search);
  if(url.search)return null;
  if(publicas.has(url.pathname))return url.pathname;
  if(/^\/tienda\/[a-z0-9][a-z0-9-]{0,199}$/.test(url.pathname))return url.pathname;
  if(/^\/c\/[a-f0-9]{16}$/.test(url.pathname)||/^\/compra\/[A-Za-z0-9_-]{16,128}$/.test(url.pathname)||/^\/pedido\/[A-Za-z0-9_-]{64}$/.test(url.pathname))return url.pathname;
  return null;
 }catch{return null;}
}
