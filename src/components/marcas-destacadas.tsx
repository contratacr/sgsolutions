'use client';

import Image from 'next/image';
import {useTranslations} from 'next-intl';
import {ArrowRight} from 'lucide-react';

const logos:Record<string,string>={HP:'hp',Epson:'epson',Lenovo:'lenovo',Ubiquiti:'ubiquiti'};

export function MarcasDestacadas({marcas,seleccionada,seleccionar}:{marcas:string[];seleccionada:string;seleccionar:(marca:string)=>void}) {
  const t=useTranslations('Tienda');
  return <section className="marcas-cinta" aria-label={t('marcas')}>
    <div className="marcas-encabezado"><div><p className="etiqueta">{t('marcasEtiqueta')}</p><h2>{t('marcas')}</h2><p className="marcas-descripcion">{t('marcasDescripcion')}</p></div>
    </div>
    <div className="marcas-ventana"><div className="marcas-pista">{[0,1].map(copia=><div className="marcas-grupo" key={copia} aria-hidden={copia===1?true:undefined}>{marcas.map(nombre=><button className="marca-ficha" key={nombre} tabIndex={copia===1?-1:0} aria-label={t('filtrarMarca',{marca:nombre})} aria-pressed={seleccionada===nombre} onClick={()=>seleccionar(nombre)}>
      <span className="marca-logo">{logos[nombre]?<Image src={`/imagenes/marcas/${logos[nombre]}.svg`} alt="" width={140} height={56}/>:<strong>{nombre}</strong>}</span><span className="marca-pie"><span>{nombre}</span><ArrowRight size={15}/></span>
    </button>)}</div>)}</div></div>
  </section>;
}
