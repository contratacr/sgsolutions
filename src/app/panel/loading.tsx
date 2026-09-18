import {getTranslations} from 'next-intl/server';
export default async function Cargando(){
 const t=await getTranslations('Error');
 return <main id="contenido" className="estado-pagina" aria-busy="true"><div className="estado-panel" role="status"><span className="estado-carga" aria-hidden="true"/><h1>{t('cargando')}</h1><p className="estado-descripcion">{t('espera')}</p></div></main>;
}
