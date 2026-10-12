'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {actualizarEurocomp} from '@/lib/eurocomp-servidor';
import {ErrorEurocomp} from '@/lib/eurocomp-protocolo';
export async function actualizarProveedor(){
 let resultado='actualizado';
 try{await actualizarEurocomp();revalidatePath('/','layout');}
 catch(e){resultado=e instanceof ErrorEurocomp?e.codigo:'almacenamiento';}
 redirect(`/panel/proveedores?resultado=${encodeURIComponent(resultado)}`);
}
