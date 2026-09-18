import Link from 'next/link';
import {ArrowLeft, ArrowRight, Compass, RefreshCw} from 'lucide-react';

type Textos={etiqueta:string;titulo:string;descripcion:string;volver:string;tienda:string;reintentar:string};
export function EstadoPagina({textos,codigo='404',reintentar}:{textos:Textos;codigo?:string;reintentar?:()=>void}){
 return <main id="contenido" className="estado-pagina"><div className="estado-panel">
  <div className="estado-ilustracion" aria-hidden="true"><span className="estado-orbita"/><span className="estado-simbolo">{codigo==='404'?<Compass size={44}/>:<RefreshCw size={44}/>}</span><span className="estado-codigo">{codigo}</span></div>
  <p className="estado-etiqueta">{textos.etiqueta}</p><h1>{textos.titulo}</h1><p className="estado-descripcion">{textos.descripcion}</p>
  <div className="estado-acciones">{reintentar?<button className="boton boton-azul" onClick={reintentar}><RefreshCw size={18}/>{textos.reintentar}</button>:<Link className="boton boton-azul" href="/"><ArrowLeft size={18}/>{textos.volver}</Link>}
  <Link className="boton boton-contorno" href={reintentar?'/':'/tienda'}>{reintentar?textos.volver:textos.tienda}<ArrowRight size={18}/></Link></div>
 </div></main>;
}
