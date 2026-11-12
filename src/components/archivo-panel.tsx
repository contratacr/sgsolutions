'use client';
import * as Dialog from '@radix-ui/react-dialog';
import {useState,type ReactNode} from 'react';
import {useFormStatus} from 'react-dom';
import {useTranslations} from 'next-intl';
import {Archive,ArchiveRestore} from 'lucide-react';
import {MarcoModal} from './marco-modal';
import {cambiarArchivoPanel} from '@/app/panel/pedidos/acciones';
import type {TipoRegistroPanel} from '@/lib/archivo-pedidos';
function Controles({confirmar,peligro=false}:{confirmar?:string;peligro?:boolean}){const {pending}=useFormStatus(),t=useTranslations('ArchivoPanel');return <div className="archivo-panel-acciones"><Dialog.Close type="button" className="boton boton-contorno" disabled={pending}>{t('cancelar')}</Dialog.Close><button className={`boton boton-azul${peligro?' pedido-confirmar-peligro':''}`} disabled={pending}>{pending?t('guardando'):confirmar??t('confirmar')}</button></div>;}
export function ArchivoPanel({id,tipo,referencia,archivado,motivo,vencido=false}:{id:string;tipo:TipoRegistroPanel;referencia:string;archivado:boolean;motivo?:string|null;vencido?:boolean}){
 const t=useTranslations('ArchivoPanel');
 return <details className="panel-opciones-secundarias"><summary>{t('opciones')}</summary>{motivo&&<p className="panel-ayuda"><strong>{t('motivoGuardado')}: </strong>{motivo}</p>}<Dialog.Root><Dialog.Trigger type="button" className="boton boton-contorno">{archivado?<ArchiveRestore size={18} aria-hidden="true"/>:<Archive size={18} aria-hidden="true"/>}{t(archivado?'restaurar':'archivar')}</Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="dialogo-fondo pedido-confirmar-fondo"/><MarcoModal className="pedido-confirmar-modal"><Dialog.Title>{t(archivado?'restaurarTitulo':'archivarTitulo',{referencia})}</Dialog.Title><Dialog.Description>{t('conserva')}{vencido&&!archivado&&<> {t('vencidoCancela')}</>}</Dialog.Description><form action={cambiarArchivoPanel}><input type="hidden" name="id" value={id}/><input type="hidden" name="tipo" value={tipo}/><input type="hidden" name="operacion" value={archivado?'restaurar':'archivar'}/><input type="hidden" name="confirmar" value="on"/>{!archivado&&<div className="archivo-panel-motivo"><label htmlFor={`archivo-motivo-${id}`}>{t('motivo')}</label><textarea id={`archivo-motivo-${id}`} name="motivo" rows={3} required minLength={3} maxLength={1000} placeholder={t('motivoEjemplo')} aria-describedby={`archivo-ayuda-${id}`}/><small id={`archivo-ayuda-${id}`}>{t('motivoPrivado')}</small></div>}<Controles/></form></MarcoModal></Dialog.Portal></Dialog.Root></details>;
}
/** Confirmation dialog for order actions with consequences (cancel, mark as paid). Texts arrive translated from the server. */
export function ConfirmarAccionPedido({accion,campos,boton,titulo,descripcion,detalles=[],confirmar,principal=false,peligro=false,icono}:{accion:(form:FormData)=>Promise<void>;campos:Record<string,string>;boton:string;titulo:string;descripcion:string;detalles?:string[];confirmar:string;principal?:boolean;peligro?:boolean;icono?:ReactNode}){
 const [abierto,setAbierto]=useState(false);
 return <Dialog.Root open={abierto} onOpenChange={setAbierto}><Dialog.Trigger type="button" className={`boton ${principal?'boton-azul':'boton-contorno'}`}>{icono}{boton}</Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="dialogo-fondo pedido-confirmar-fondo"/><MarcoModal className="pedido-confirmar-modal"><Dialog.Title>{titulo}</Dialog.Title><Dialog.Description>{descripcion}</Dialog.Description>{detalles.length>0&&<ul>{detalles.map(d=><li key={d}>{d}</li>)}</ul>}<form action={accion}>{Object.entries(campos).map(([k,v])=><input key={k} type="hidden" name={k} value={v}/>)}<Controles confirmar={confirmar} peligro={peligro}/></form></MarcoModal></Dialog.Portal></Dialog.Root>;
}
