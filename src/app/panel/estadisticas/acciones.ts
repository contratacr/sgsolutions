'use server';
import {exigirAdminMfa} from '@/lib/acceso-panel';
import {revalidatePath} from 'next/cache';
import {procesarPublicidad} from '@/lib/publicidad-servidor';
import {reconciliarPagosMedicion,reconciliarSolicitudesMedicion} from '@/lib/medicion-negocio';
import {procesarSolicitudesEmpresas} from '@/lib/solicitudes-empresa-servidor';
export async function procesarMedicionPanel(){
 await exigirAdminMfa();
 await reconciliarSolicitudesMedicion();await reconciliarPagosMedicion();await procesarPublicidad();await procesarSolicitudesEmpresas();revalidatePath('/panel/estadisticas');
}
