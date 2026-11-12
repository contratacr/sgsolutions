import {exigirAdminMfa} from '@/lib/acceso-panel';
import {incorporarEmpresariales} from '@/lib/incorporar-empresariales';
import {migrarCatalogoManual} from '@/lib/catalogo-manual';
import {redirect} from 'next/navigation';
import {getTranslations} from 'next-intl/server';
import {crearClienteServidor} from '@/lib/supabase/servidor';
import {obtenerCatalogoInicial} from '@/lib/catalogo-servidor';
import {esquemaCatalogo} from '@/lib/catalogo-modelo';
import {EditorCatalogo} from '@/components/editor-catalogo';
import {sesionLocal,leerLocal} from '@/lib/admin-local';
import {EncabezadoPanel} from '@/components/encabezado-panel';
import './catalogo-panel.css';
export const metadata={robots:{index:false,follow:false}};
async function Encabezado(){
 const t=await getTranslations('AdminCatalogo'),p=await getTranslations('Panel');
 return <EncabezadoPanel seccion={p('tiendaContenido')} titulo={t('titulo')} descripcion={t('descripcion')}/>;
}
export default async function Administrar({searchParams}:{searchParams:Promise<{producto?:string|string[]}>}){
 await exigirAdminMfa();
 const solicitado=(await searchParams).producto;
 // Internal deep link from Proveedores: opens that product's editor when it exists.
 const productoInicial=typeof solicitado==='string'?solicitado.slice(0,60):undefined;
 const local=await sesionLocal();
 if(local){const guardado=await leerLocal('catalogo');return <main id="contenido" className="contenedor seccion"><Encabezado/><EditorCatalogo productoInicial={productoInicial} inicial={guardado?incorporarEmpresariales(migrarCatalogoManual(esquemaCatalogo.parse(guardado.contenido))):obtenerCatalogoInicial()} revisionInicial={guardado?.revision??0}/></main>;}
 const cliente=await crearClienteServidor();if(!cliente)redirect('/admin');
 const {data:{user}}=await cliente.auth.getUser();if(!user)redirect('/admin');
 const {data:perfil}=await cliente.from('perfiles').select('rol').eq('id',user.id).eq('activo',true).maybeSingle();
 if(perfil?.rol!=='administrador')redirect('/panel');
 const {data,error}=await cliente.from('catalogo_privado').select('contenido,revision').eq('id',1).maybeSingle();
 const t=await getTranslations('AdminCatalogo');
 if(error)return <main id="contenido" className="contenedor seccion"><Encabezado/><p>{t('noDisponible')}</p></main>;
 return <main id="contenido" className="contenedor seccion"><Encabezado/><EditorCatalogo productoInicial={productoInicial} inicial={data?incorporarEmpresariales(migrarCatalogoManual(esquemaCatalogo.parse(data.contenido))):obtenerCatalogoInicial()} revisionInicial={data?.revision??0}/></main>;
}
