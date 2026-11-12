'use client';
import {useTranslations} from 'next-intl';
import {Trash2} from 'lucide-react';
import {eliminarConsulta} from '@/app/panel/pedidos/asesoria-acciones';
import {ConfirmarAccionPedido} from './archivo-panel';
export function EliminarConsulta({id,referencia}:{id:string;referencia?:string}){
 const t=useTranslations('AsesoriaAdmin');
 return <div className="panel-opciones-secundarias panel-eliminar-consulta"><p>{t('eliminarAyuda')}</p>{referencia&&<p><code>{referencia}</code></p>}<ConfirmarAccionPedido accion={eliminarConsulta} campos={{id,confirmarEliminar:'on'}} icono={<Trash2 size={18} aria-hidden="true"/>} boton={t('eliminar')} titulo={referencia?t('eliminarTitulo',{referencia}):t('eliminar')} descripcion={t('eliminarAyuda')} detalles={[t('confirmarEliminar')]} confirmar={t('eliminar')} peligro/></div>;
}
