'use client';

import Image from 'next/image';
import {useEffect,useRef,useState} from 'react';
import {useTranslations} from 'next-intl';
import {ArrowRight} from 'lucide-react';

import fuentes from '@/lib/marcas-logos.json';

const logos:Record<string,{archivo:string;fuente:string}>=fuentes;

export function MarcasDestacadas({marcas,seleccionada,seleccionar}:{marcas:string[];seleccionada:string;seleccionar:(marca:string)=>void}) {
  const t=useTranslations('Tienda');
  const pista=useRef<HTMLDivElement>(null);
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
  const lista=carga?.clave===clave;
  return <section className="marcas-cinta" aria-label={t('marcas')}>
    <div className="marcas-encabezado"><div><p className="etiqueta">{t('marcasEtiqueta')}</p><h2>{t('marcas')}</h2><p className="marcas-descripcion">{t('marcasDescripcion')}</p></div>
    </div>
    <div className="marcas-ventana"><div className="marcas-pista" ref={pista} data-lista={lista}>{[0,1].map(copia=><div className="marcas-grupo" key={copia} aria-hidden={copia===1?true:undefined}>{marcas.map(nombre=><button className="marca-ficha" key={nombre} tabIndex={copia===1?-1:0} aria-label={t('filtrarMarca',{marca:nombre})} aria-pressed={seleccionada===nombre} onClick={()=>seleccionar(nombre)}>
      <span className="marca-logo">{logos[nombre]&&!carga?.fallos.includes(`/imagenes/marcas/${logos[nombre].archivo}`)?<Image src={`/imagenes/marcas/${logos[nombre].archivo}`} alt="" width={140} height={56} loading="eager" unoptimized/>:<strong>{nombre}</strong>}</span><span className="marca-pie"><span>{nombre}</span><ArrowRight size={15}/></span>
    </button>)}</div>)}</div></div>
  </section>;
}
