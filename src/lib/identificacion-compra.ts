/** Validación de formato; no consulta ni verifica la identidad en el Registro. */
export function identificacionCompraValida(tipo:string|undefined,valor:string){
 const limpia=valor.trim().replace(/[\s-]/g,'');
 return (tipo==='juridica'?/^\d{10}$/:/^\d{9}$/).test(limpia);
}
