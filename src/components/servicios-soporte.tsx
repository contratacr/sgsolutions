import {getTranslations} from 'next-intl/server';
import {ArrowUpRight, Plus} from 'lucide-react';

export async function ServiciosSoporte(){
 const t=await getTranslations('ServiciosSoporte');
 return <section className="contenedor seccion servicios-soporte">
  <div className="encabezado-seccion"><div><p className="etiqueta">{t('etiqueta')}</p><h2>{t('titulo')}</h2></div><p>{t('descripcion')}</p></div>
  <div className="servicios-grupos">{[8,5,5,4,3].map((cantidad,i)=><details className="servicio-grupo" key={i}>
   <summary><span className="servicio-indice">0{i+1}</span><h3>{t(`grupo${i}`)}</h3><Plus size={20}/></summary>
   <ul>{Array.from({length:cantidad},(_,j)=><li key={j}><h4>{t(`g${i}s${j}Titulo`)}</h4><p>{t(`g${i}s${j}Texto`)}</p></li>)}</ul>
  </details>)}</div>
  <aside className="soporte-empresa"><div><h3>{t('empresaTitulo')}</h3><p>{t('empresaTexto')}</p></div><a className="boton boton-azul" href="/empresas#planes">{t('empresaAccion')}<ArrowUpRight size={17}/></a></aside>
 </section>;
}
