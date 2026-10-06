/** The order already exists: an upload failure must never trigger order creation again. */
export async function adjuntarComprobantePedido(destino:URL,archivo:File|null){
 if(!archivo)return destino;
 try{
  const form=new FormData();form.set('pedido',destino.searchParams.get('pedido')??'');form.set('acceso',destino.searchParams.get('acceso')??'');form.set('archivo',archivo);
  const respuesta=await fetch('/api/pedidos/manual/comprobante',{method:'POST',body:form,signal:AbortSignal.timeout(30000)});
  if(!respuesta.ok)destino.searchParams.set('comprobante','pendiente');
 }catch{destino.searchParams.set('comprobante','pendiente');}
 return destino;
}
