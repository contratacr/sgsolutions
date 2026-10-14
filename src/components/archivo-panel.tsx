'use client';
import {useRef} from 'react';
import {useFormStatus} from 'react-dom';
import {useTranslations} from 'next-intl';
import {Archive,ArchiveRestore} from 'lucide-react';
import {cambiarArchivoPanel} from '@/app/panel/pedidos/acciones';
import type {TipoRegistroPanel} from '@/lib/archivo-pedidos';
function Controles({cerrar}:{cerrar:()=>void}){const {pending}=useFormStatus(),t=useTranslations('ArchivoPanel');return <div className="archivo-panel-acciones"><button type="button" className="boton boton-contorno" disabled={pending} onClick={cerrar}>{t('cancelar')}</button><button className="boton boton-azul" disabled={pending}>{t(pending?'guardando':'confirmar')}</button></div>;}
export function ArchivoPanel({id,tipo,referencia,archivado}:{id:string;tipo:TipoRegistroPanel;referencia:string;archivado:boolean}){
 const t=useTranslations('ArchivoPanel'),dialogo=useRef<HTMLDialogElement>(null),boton=useRef<HTMLButtonElement>(null);
 const cerrar=()=>{dialogo.current?.close();boton.current?.focus();};
 return <details className="panel-opciones-secundarias"><summary>{t('opciones')}</summary><button ref={boton} type="button" className="boton boton-contorno" onClick={()=>dialogo.current?.showModal()}>{archivado?<ArchiveRestore size={18} aria-hidden="true"/>:<Archive size={18} aria-hidden="true"/>}{t(archivado?'restaurar':'archivar')}</button><dialog ref={dialogo} className="archivo-panel-dialogo" aria-labelledby={`archivo-titulo-${id}`} onClick={e=>{if(e.target===e.currentTarget)cerrar();}}><h2 id={`archivo-titulo-${id}`}>{t(archivado?'restaurarTitulo':'archivarTitulo',{referencia})}</h2><p>{t('conserva')}</p><form action={cambiarArchivoPanel}><input type="hidden" name="id" value={id}/><input type="hidden" name="tipo" value={tipo}/><input type="hidden" name="operacion" value={archivado?'restaurar':'archivar'}/><input type="hidden" name="confirmar" value="on"/><Controles cerrar={cerrar}/></form></dialog></details>;
}
