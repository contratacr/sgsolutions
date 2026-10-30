import {getLocale,getTranslations} from 'next-intl/server';
import {popularidadCatalogo} from '@/lib/popularidad-catalogo';
import {Catalogo} from '@/components/catalogo';
import {leerCatalogoPublico} from '@/lib/catalogo-servidor';
import {consultarCatalogo} from '@/lib/catalogo-consulta';
import {leerUrlTienda,parametrosApiTienda,parametrosUrlTienda} from '@/lib/url-tienda';

type Consulta={searchParams:Promise<Record<string,string|string[]|undefined>>};
function parametros(valores:Record<string,string|string[]|undefined>){
 const resultado=new URLSearchParams();
 for(const [clave,valor] of Object.entries(valores)){
  for(const item of Array.isArray(valor)?valor:valor===undefined?[]:[valor])resultado.append(clave,item);
 }
 return resultado;
}
export async function generateMetadata({searchParams}:Consulta){
 const t=await getTranslations('Navegacion'),a=await getTranslations('Asesoria');
 const filtrada=parametrosUrlTienda(leerUrlTienda(parametros(await searchParams))).size>0;
 return {title:t('tienda'),description:a('metaDescripcion'),...(filtrada?{robots:{index:false,follow:true}}:{})};
}
export default async function Soluciones({searchParams}:Consulta){
 const estado=leerUrlTienda(parametros(await searchParams));
 const idioma=await getLocale(),catalogo=await leerCatalogoPublico();
 const inicial=consultarCatalogo(catalogo,parametrosApiTienda(estado,idioma),estado.orden==='recomendados'?await popularidadCatalogo():{});
 // The server and client start from the same selection, including the valid page.
 const estadoInicial={...estado,pagina:inicial.pagina};
 return <main id="contenido" className="tienda-compacta"><div className="contenedor"><Catalogo key={idioma+parametrosUrlTienda(estadoInicial).toString()} inicial={inicial} estadoInicial={estadoInicial}/></div></main>;
}
