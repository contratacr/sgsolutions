import type {ReactNode} from 'react';

/** Shared page header for every administrative module: section eyebrow, title, short help and primary actions. */
export function EncabezadoPanel({seccion,titulo,descripcion,acciones,oculto}:{seccion?:string;titulo:string;descripcion?:ReactNode;acciones?:ReactNode;oculto?:boolean}){
 return <header className={oculto?'sr-only':'panel-encabezado'}><div>{seccion&&<span className="panel-encabezado-miga">{seccion}</span>}<h1>{titulo}</h1>{descripcion&&<p>{descripcion}</p>}</div>{acciones&&<div className="panel-encabezado-acciones">{acciones}</div>}</header>;
}
