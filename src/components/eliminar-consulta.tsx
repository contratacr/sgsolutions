'use client';
import {useTranslations} from 'next-intl';
import {useFormStatus} from 'react-dom';
import {Trash2} from 'lucide-react';
import {eliminarConsulta} from '@/app/panel/pedidos/asesoria-acciones';
function BotonEliminar(){const {pending}=useFormStatus(),t=useTranslations('AsesoriaAdmin');return <button className="boton boton-contorno" disabled={pending}><Trash2 size={18} aria-hidden="true"/>{t(pending?'eliminando':'eliminar')}</button>;}
export function EliminarConsulta({id}:{id:string}){
 const t=useTranslations('AsesoriaAdmin');
 return <details className="panel-opciones-secundarias panel-eliminar-consulta"><summary>{t('eliminar')}</summary><p>{t('eliminarAyuda')}</p><form action={eliminarConsulta}><input type="hidden" name="id" value={id}/><label className="panel-confirmar-eliminar"><input type="checkbox" name="confirmarEliminar" required/>{t('confirmarEliminar')}</label><BotonEliminar/></form></details>;
}
