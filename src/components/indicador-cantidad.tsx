export function IndicadorCantidad({cantidad,clase=''}:{cantidad:number;clase?:string}){
 return cantidad>0?<span className={`indicador-cantidad ${clase}`} aria-hidden="true">{cantidad>99?'99+':cantidad}</span>:null;
}
