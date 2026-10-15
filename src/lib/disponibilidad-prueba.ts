import type {PedidoPropuesta,EstadoPropuesta,MetodoPropuesta,EntregaPropuesta} from './pedidos-propuesta';
export const productosDisponibilidad=[
 {id:'combo',codigo:'920-011312',stock:25,precio:30500},
 {id:'router',codigo:'ARCHER-C6',stock:3,precio:17000},
 {id:'mouse',codigo:'910-006757',stock:14,precio:11000},
 {id:'monitor',codigo:'MONITOR-24',stock:0,precio:68000},
 {id:'cargador',codigo:'PA046RBU001C',stock:null,precio:10000},
] as const;
export type LineaEnlacePrueba={producto:string;cantidad:number;precio:number};
export type EnlacePrueba={id:string;token:string;creado:string;vence:string;cliente:string;lineas:LineaEnlacePrueba[];estado:EstadoPropuesta;guia?:string;comprobante?:{nombre:string;tipo:string};datos?:Record<string,string>;metodo?:MetodoPropuesta;entrega?:EntregaPropuesta};
export const claveEnlacesPrueba='sg-vista-previa-enlaces-v1';
export function lineasValidasPrueba(lineas:LineaEnlacePrueba[]){return lineas.length>0&&lineas.length<=30&&new Set(lineas.map(l=>l.producto)).size===lineas.length&&lineas.every(l=>{const p=productosDisponibilidad.find(p=>p.id===l.producto);return p&&p.stock!==null&&p.stock>0&&Number.isInteger(l.cantidad)&&l.cantidad>0&&l.cantidad<=p.stock&&Number.isSafeInteger(l.precio)&&l.precio>0&&l.precio<=100000000;});}
export function enlaceVencidoPrueba(e:EnlacePrueba){return Date.parse(e.vence)<=Date.now();}
export function totalEnlacePrueba(e:Pick<EnlacePrueba,'lineas'|'entrega'>){return e.lineas.reduce((s,l)=>s+l.precio*l.cantidad,0)+(e.entrega==='envio'?4000:0);}
export function pedidoDesdeEnlace(e:EnlacePrueba):PedidoPropuesta{
 return {id:e.id,guia:e.guia,comprobante:e.comprobante,cliente:e.cliente,fecha:e.creado,metodo:e.metodo??'tarjeta',entrega:e.entrega??'retiro',estado:e.estado,total:totalEnlacePrueba(e),producto:e.lineas[0].producto,cantidad:e.lineas.reduce((s,l)=>s+l.cantidad,0),lineas:e.lineas,enlaceToken:e.token,venceEn:e.vence,sinModalidad:!e.metodo||!e.entrega};
}
export function rutaEnlacePrueba(token:string){return '/c/'+encodeURIComponent(codigoEnlacePrueba(token));}

export function codigoEnlacePrueba(token:string){return token.replaceAll('-','').slice(0,16);}
