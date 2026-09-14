import {redirect} from 'next/navigation';
import {getTranslations} from 'next-intl/server';
import {crearClienteServidor} from '@/lib/supabase/servidor';
import {catalogoInicial} from '@/lib/catalogo-servidor';
import {esquemaCatalogo} from '@/lib/catalogo-modelo';
import {EditorCatalogo} from '@/components/editor-catalogo';
export const metadata={robots:{index:false,follow:false}};
export default async function Administrar(){
 const cliente=await crearClienteServidor();if(!cliente)redirect('/acceso');
 const {data:{user}}=await cliente.auth.getUser();if(!user)redirect('/acceso');
 const {data:perfil}=await cliente.from('perfiles').select('rol').eq('id',user.id).eq('activo',true).maybeSingle();
 if(perfil?.rol!=='administrador')redirect('/panel');
 const {data,error}=await cliente.from('catalogo_privado').select('contenido,revision').eq('id',1).maybeSingle();
 const t=await getTranslations('AdminCatalogo');
 if(error)return <main id="contenido" className="contenedor seccion"><h1>{t('titulo')}</h1><p>{t('noDisponible')}</p></main>;
 return <main id="contenido" className="contenedor seccion"><h1>{t('titulo')}</h1><EditorCatalogo inicial={data?esquemaCatalogo.parse(data.contenido):catalogoInicial} revisionInicial={data?.revision??0}/></main>;
}
