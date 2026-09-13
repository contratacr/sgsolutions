'use client';

import Image from 'next/image';
import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {ArrowRight, Pause, Play} from 'lucide-react';

const logos:Record<string,string>={HP:'hp',Epson:'epson',Lenovo:'lenovo',Ubiquiti:'ubiquiti'};

export function MarcasDestacadas({marcas,seleccionada,seleccionar,verTodas}:{marcas:string[];seleccionada:string;seleccionar:(marca:string)=>void;verTodas:()=>void}) {
  const t=useTranslations('Tienda');
  const [pausada,setPausada]=useState(false);
  return <section className="marcas-cinta" aria-label={t('marcas')} data-pausa={pausada}>
    <div className="marcas-encabezado"><div><p className="etiqueta">{t('marcasEtiqueta')}</p><h2>{t('marcas')}</h2><p className="marcas-descripcion">{t('marcasDescripcion')}</p></div>
      <div className="marcas-controles"><button className="marcas-ver" onClick={verTodas}>{t('todasMarcas')}<ArrowRight size={16}/></button><button className="marcas-pausa" onClick={()=>setPausada(!pausada)} aria-label={t(pausada?'reanudarMarcas':'pausarMarcas')}>{pausada?<Play size={16}/>:<Pause size={16}/>}</button></div>
    </div>
    <div className="marcas-ventana"><div className="marcas-pista">{[0,1].map(copia=><div className="marcas-grupo" key={copia} aria-hidden={copia===1?true:undefined}>{marcas.map(nombre=><button className="marca-ficha" key={nombre} tabIndex={copia===1?-1:0} aria-label={t('filtrarMarca',{marca:nombre})} aria-pressed={seleccionada===nombre} onClick={()=>seleccionar(nombre)}>
      <span className="marca-logo">{logos[nombre]?<Image src={`/imagenes/marcas/${logos[nombre]}.svg`} alt="" width={140} height={56}/>:<strong>{nombre}</strong>}</span><span className="marca-pie"><span>{nombre}</span><ArrowRight size={15}/></span>
    </button>)}</div>)}</div></div>
  </section>;
}
