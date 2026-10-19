import {navegadorAdministrativoGuardado} from '@/lib/exclusion-medicion';
import Script from 'next/script';
import {permisoConteo} from '@/lib/permiso-conteo';
import {AvisoFavoritos} from '@/components/aviso-favoritos';
import {SesionCuentaProvider} from '@/components/sesion-cuenta';
import {ConfiguracionSitio} from '@/components/configuracion-sitio';
import {leerContenido} from '@/lib/contenido-servidor';
import {cookies} from 'next/headers';
import {crearClienteCuenta} from '@/lib/supabase/cuenta';
import {Medicion} from '@/components/medicion';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { Cabecera } from '@/components/cabecera';
import { Pie } from '@/components/pie';
import {FocoInteraccion} from '@/components/foco-interaccion';
import {DatosCatalogo} from '@/components/datos-catalogo';
import {resumenCatalogo,consultarCatalogo} from '@/lib/catalogo-consulta';
import {leerCatalogoPublico} from '@/lib/catalogo-servidor';
import './globals.css';
import './refinamiento.css';
import './entrada.css';
import './tienda.css';
import './acabado.css';
import './marcas.css';
import './solicitud.css';
import './movimiento-visual.css';
import './estados.css';
import './admin.css';
import './revision-visual.css';
// Keep administrative chrome and route styles in the initial blocking stylesheet.
import '@/components/navegacion-panel.css';
import '@/components/proteger-cambios-panel.css';
import './panel/pedidos/pedidos.css';
import './panel/usuarios/usuarios.css';
import './panel/soporte/soporte.css';
import './panel/estadisticas/estadisticas.css';
import {RevelarScroll} from '@/components/revelar-scroll';
import {META_PIXEL_ID} from '@/lib/meta-pixel';
import {ValidacionNativa} from '@/components/validacion-nativa';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Marca');
  return { title: {default: t('nombre'), template: `%s | ${t('nombre')}`}, description: t('descripcion') };
}
export default async function DisenoRaiz({children}: {children: React.ReactNode}) {
  const t = await getTranslations('Navegacion');
  const idioma = await getLocale();
  const [catalogo,contenido] = await Promise.all([leerCatalogoPublico(),leerContenido()]);
  let sesionIniciada=false;
  let nombreCuenta="";let administradorCuenta=false;let cuentaExcluida=false;let navegadorAdministrador=await navegadorAdministrativoGuardado();
  if((await cookies()).getAll().some(c=>/^sb-.*-auth-token(?:\.\d+)?$/.test(c.name))){
    try{const cliente=await crearClienteCuenta();const autenticacion=await cliente?.auth.getUser();cuentaExcluida=!cliente||Boolean(autenticacion?.error);const usuario=autenticacion?.data.user;sesionIniciada=Boolean(usuario);nombreCuenta=String(usuario?.user_metadata?.nombre_completo||usuario?.user_metadata?.full_name||usuario?.user_metadata?.name||'').split(' ')[0];if(usuario&&cliente){const perfil=await cliente.from('perfiles').select('rol,activo').eq('id',usuario.id).maybeSingle();navegadorAdministrador=navegadorAdministrador||perfil.data?.rol==='administrador';cuentaExcluida=Boolean(perfil.error)||perfil.data?.rol==='administrador';administradorCuenta=perfil.data?.rol==='administrador'&&perfil.data?.activo===true;}}catch{cuentaExcluida=true;/* No medir una sesión cuyo rol no se pudo verificar. */}
  }
  const vistaMovilLocal=process.env.NODE_ENV==='development'&&process.env.SG_ENTORNO==='local'&&process.env.SG_MOBILE_PREVIEW==='1';
  const excluirMedicion=navegadorAdministrador||vistaMovilLocal||cuentaExcluida||administradorCuenta||Boolean(await (await import('@/lib/admin-local')).sesionLocal());
  return <html lang={idioma}><body data-administracion-medicion={navegadorAdministrador?'1':undefined} data-excluir-medicion={excluirMedicion?'1':undefined} data-permiso-conteo={permisoConteo(excluirMedicion)}><Script src="/panel-history.js" strategy="beforeInteractive"/>{vistaMovilLocal&&<Script src="/sg-native-bridge.js" strategy="afterInteractive"/>}{process.env.NODE_ENV==='development'&&process.env.SG_ENTORNO==='local'&&process.env.SG_QA_LOCAL==='1'&&<aside className="aviso-qa-local" role="status">{t('entornoPruebas')}</aside>}<FocoInteraccion/><RevelarScroll/><NextIntlClientProvider><SesionCuentaProvider iniciada={sesionIniciada}><ConfiguracionSitio contacto={contenido.contacto} imagenes={contenido.imagenes}><ValidacionNativa/><DatosCatalogo datos={{...resumenCatalogo(catalogo),productos:consultarCatalogo(catalogo,new URLSearchParams()).productos}}><a className="saltar" href="#contenido">{t('saltar')}</a><Cabecera sesionIniciada={sesionIniciada} nombreCuenta={nombreCuenta} administrador={administradorCuenta}/>{children}<Pie/><AvisoFavoritos/><Medicion pixel={META_PIXEL_ID}/></DatosCatalogo></ConfiguracionSitio></SesionCuentaProvider></NextIntlClientProvider></body></html>;
}
