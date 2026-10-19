'use server';
import {exigirAdminMfa} from '@/lib/acceso-panel';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {actualizarEurocomp} from '@/lib/eurocomp-servidor';
import {ErrorEurocomp} from '@/lib/eurocomp-protocolo';
export async function actualizarProveedor(){
 await exigirAdminMfa();
 let resultado='actualizado';
 try{await actualizarEurocomp();revalidatePath('/','layout');}
 catch(e){console.error('EUROCOMP_ACTUALIZACION_FALLO',e instanceof ErrorEurocomp?e.codigo:e instanceof Error?e.name:'desconocido',e instanceof Error?e.stack?.split('\n')[1]?.slice(0,150):undefined);resultado=e instanceof ErrorEurocomp?e.codigo:'almacenamiento';}
 redirect(`/panel/proveedores?resultado=${encodeURIComponent(resultado)}`);
}
