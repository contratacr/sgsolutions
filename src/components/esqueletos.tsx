export function EsqueletoCatalogo({texto}:{texto:string}){
 return <div className="carga-esqueleto" role="status" aria-label={texto}><span className="sr-only">{texto}</span><div className="shop-grid" aria-hidden="true">{Array.from({length:6},(_,i)=><div className="esqueleto-producto" key={i}><div className="esqueleto esqueleto-foto"/><div className="esqueleto-producto-texto"><div className="esqueleto esqueleto-corto"/><div className="esqueleto"/><div className="esqueleto"/><div className="esqueleto esqueleto-precio"/><div className="esqueleto esqueleto-boton"/></div></div>)}</div></div>;
}
export function EsqueletoPanel({texto}:{texto:string}){
 return <main id="contenido" className="contenedor panel-esqueleto" aria-busy="true"><div role="status" aria-label={texto}><h1 className="sr-only">{texto}</h1><div aria-hidden="true"><div className="esqueleto esqueleto-titulo"/><div className="esqueleto esqueleto-corto"/><div className="esqueleto-resumen">{[0,1,2].map(i=><div className="esqueleto esqueleto-tarjeta" key={i}/>)}</div><div className="esqueleto esqueleto-buscador"/>{[0,1,2,3,4].map(i=><div className="esqueleto-fila" key={i}><div className="esqueleto esqueleto-miniatura"/><div><div className="esqueleto"/><div className="esqueleto esqueleto-corto"/></div></div>)}</div></div></main>;
}
export function EsqueletoCarrito({texto}:{texto:string}){
 return <div role="status" aria-label={texto} className="carrito-esqueleto"><span className="sr-only">{texto}</span>{[0,1].map(i=><div className="esqueleto-fila" key={i} aria-hidden="true"><div className="esqueleto esqueleto-miniatura"/><div><div className="esqueleto"/><div className="esqueleto esqueleto-corto"/></div></div>)}</div>;
}
