import {NavegacionPanel} from '@/components/navegacion-panel';
import {leerAccesoPanel} from '@/lib/acceso-panel';
import {AccesoDenegado} from '@/components/acceso-denegado';
import {redirect} from 'next/navigation';
export default async function DisenoPanel({children}:{children:React.ReactNode}){
 const acceso=await leerAccesoPanel();
 if(acceso==='sinSesion')redirect('/admin');
 if(acceso!=='administrador')return <AccesoDenegado error={acceso==='error'}/>;
 return <div className="panel-diseno"><NavegacionPanel/>{children}</div>;
}
