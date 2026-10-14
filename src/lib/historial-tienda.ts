type Historial={activo:boolean;ids:string[];vistas:string[]};
let ids:string[]=[];
let vistas:string[]=[];
function limpiarLegado(){
 try{localStorage.removeItem('sg-recomendaciones');sessionStorage.removeItem('sg-intereses-sesion');}catch{}
}
export function leerHistorial():Historial{
 limpiarLegado();
 try{if(localStorage.getItem('sg-recomendaciones-desactivadas')==='1')return {activo:false,ids:[],vistas:[]};}catch{}
 return {activo:true,ids:[...ids],vistas:[...vistas]};
}
// Solo memoria de esta página: no persiste al recargar ni se vincula a una cuenta.
export function recordarExploracion(nuevos:string[],vista=false){
 if(!leerHistorial().activo)return;
 const validos=nuevos.filter(id=>/^[a-z0-9][a-z0-9-]{0,59}$/.test(id));
 ids=[...new Set([...validos,...ids])].slice(0,20);
 if(vista)vistas=[...new Set([...validos,...vistas])].filter(id=>ids.includes(id)).slice(0,20);
 window.dispatchEvent(new Event('sg-historial'));
}
