export function origenPermitido(request:Request){
 try{const origen=new URL(request.headers.get('origin')??'');return origen.host===request.headers.get('host')&&(origen.protocol==='https:'||(['localhost','127.0.0.1','[::1]'].includes(origen.hostname)&&origen.protocol==='http:'));}catch{return false;}
}
