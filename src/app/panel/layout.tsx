import {ProtegerCambiosPanel} from '@/components/proteger-cambios-panel';
import {NavegacionPanel} from '@/components/navegacion-panel';
import {CuentaPanelAdmin} from '@/components/cuenta-panel-admin';
import {leerAccesoPanel} from '@/lib/acceso-panel';
import {AccesoDenegado} from '@/components/acceso-denegado';
import {sesionLocal} from '@/lib/admin-local';
import {crearClienteServidor} from '@/lib/supabase/servidor';
import {redirect} from 'next/navigation';
async function correoAdministrador(){
 try{
  const local=await sesionLocal();if(local)return local.correo;
  const cliente=await crearClienteServidor();if(!cliente)return null;
  const {data:{user}}=await cliente.auth.getUser();return user?.email??null;
 }catch{return null;}
}
export default async function DisenoPanel({children}:{children:React.ReactNode}){
 const acceso=await leerAccesoPanel();
 if(acceso==='mfa')redirect('/admin/doble-factor');
 if(acceso==='sinSesion')redirect('/admin');
 if(acceso!=='administrador')return <AccesoDenegado error={acceso==='error'}/>;
 return <ProtegerCambiosPanel><div className="panel-diseno panel-renovado"><NavegacionPanel cuenta={<CuentaPanelAdmin correo={await correoAdministrador()}/>}/>{children}</div></ProtegerCambiosPanel>;
}
