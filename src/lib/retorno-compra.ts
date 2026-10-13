// Only checkout destinations owned by SG Solutions may receive the signed-in session.
export function retornoCompra(valor:unknown):string|null{
 if(typeof valor!=='string'||valor.length>512||!valor.startsWith('/'))return null;
 try{
  const url=new URL(valor,'https://sg.invalid');
  if(url.origin!=='https://sg.invalid'||!['/pagar','/finalizar-compra'].includes(url.pathname)||url.hash)return null;
  const parametros=[...url.searchParams.keys()];
  if(!parametros.length)return url.pathname;
  const id=url.searchParams.get('asesoria'),token=url.searchParams.get('acceso');
  if(parametros.length!==2||!parametros.includes('asesoria')||!parametros.includes('acceso')||!id||!token||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||!/^(?:[0-9a-f]{32}|[0-9a-f]{64})$/.test(token))return null;
  return url.pathname+'?'+new URLSearchParams({asesoria:id,acceso:token});
 }catch{return null;}
}
export function enlaceIngresoCompra(destino='/pagar',registro=false){
 return '/cuenta?'+new URLSearchParams({retorno:retornoCompra(destino)??'/pagar',...(registro?{modo:'registro'}:{})});
}
