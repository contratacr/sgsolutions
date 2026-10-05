'use client';

import Image from 'next/image';
import {useEffect,useRef,useState} from 'react';
import {useTranslations} from 'next-intl';

import fuentes from '@/lib/marcas-logos.json';

const logos:Record<string,{archivo:string;fuente:string}>=fuentes;

export function MarcasDestacadas({marcas,seleccionada,seleccionar}:{marcas:string[];seleccionada:string;seleccionar:(marca:string)=>void}) {
  const t=useTranslations('Tienda');
  const pista=useRef<HTMLDivElement>(null);
  const ventana=useRef<HTMLDivElement>(null);
  const [repeticiones,setRepeticiones]=useState(1);
  const clave=marcas.join('|');
  const [carga,setCarga]=useState<{clave:string;fallos:string[]}|null>(null);
  useEffect(()=>{
    let vigente=true;
    const imagenes=Array.from(pista.current?.querySelectorAll('img')??[]);
    Promise.all(imagenes.map(async img=>{
      try {await img.decode();return null;}
      catch {return img.getAttribute('src');}
    })).then(resultados=>{
      if(vigente)setCarga({clave,fallos:resultados.filter((src):src is string=>src!==null)});
    });
    return ()=>{vigente=false;};
  },[clave]);
  useEffect(()=>{
    const contenedor=ventana.current;
    if(!contenedor)return;
    const ajustar=()=>{
      const botones=Array.from(pista.current?.querySelector('.marcas-grupo')?.querySelectorAll('button')??[]).slice(0,marcas.length);
      const ancho=botones.reduce((total,b)=>total+b.getBoundingClientRect().width+14,0);
      if(ancho>0)setRepeticiones(Math.max(1,Math.ceil(contenedor.clientWidth/ancho)));
    };
    const observador=new ResizeObserver(ajustar);observador.observe(contenedor);ajustar();
    return()=>observador.disconnect();
  },[clave,marcas.length]);
  const lista=carga?.clave===clave;
  return <section className="marcas-cinta" aria-label={t('marcas')}>
    <div className="marcas-encabezado"><div><p className="etiqueta">{t('marcasEtiqueta')}</p><h2>{t('marcas')}</h2><p className="marcas-descripcion">{t('marcasDescripcion')}</p></div>
    </div>
    <div className="marcas-ventana" ref={ventana} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))e.currentTarget.scrollLeft=0;}}><div className="marcas-pista" ref={pista} data-lista={lista}>{[0,1].map(copia=><div className="marcas-grupo" key={copia} aria-hidden={copia===1?true:undefined}>{Array.from({length:repeticiones},(_,repeticion)=>marcas.map(nombre=><button className="marca-ficha" key={`${repeticion}-${nombre}`} aria-hidden={repeticion>0?true:undefined} tabIndex={copia===1||repeticion>0?-1:0} aria-label={t('filtrarMarca',{marca:nombre})} aria-pressed={seleccionada===nombre} onClick={()=>seleccionar(nombre)}>
      <span className="marca-logo">{logos[nombre]&&!carga?.fallos.includes(`/imagenes/marcas/${logos[nombre].archivo}`)?<Image src={`/imagenes/marcas/${logos[nombre].archivo}`} alt="" width={140} height={56} loading="eager" unoptimized/>:<strong>{nombre}</strong>}</span><span className="marca-pie"><span>{nombre}</span></span>
    </button>))}</div>)}</div></div>
  </section>;
}
