'use client';
import {useActionState,useState} from 'react';
import {useTranslations} from 'next-intl';
import {asignarRolCliente,type EstadoRol} from './acciones';
async function guardarSeguro(estado:EstadoRol,formulario:FormData):Promise<EstadoRol>{
 try{return await asignarRolCliente(estado,formulario);}catch{return 'error';}
}
export function RolCliente({id,rol,nombre}:{id:string;rol:'particular'|'empresa';nombre:string}){
 const t=useTranslations('UsuariosPanel');const [nuevo,setNuevo]=useState(rol);
 const [estado,accion,pendiente]=useActionState(guardarSeguro,'inicio' as EstadoRol);
 return <form action={accion} onReset={e=>e.preventDefault()} className="usuario-rol" aria-label={t('asignarA',{nombre})} aria-busy={pendiente}>
  <input type="hidden" name="usuario" value={id}/><input type="hidden" name="anterior" value={rol}/>
  <label htmlFor={`rol-${id}`} className="sr-only">{t('rol')}</label>
  <select id={`rol-${id}`} name="nuevo" value={nuevo} onChange={e=>setNuevo(e.target.value as typeof rol)} disabled={pendiente}><option value="particular">{t('particular')}</option><option value="empresa">{t('empresa')}</option></select>
  <button className="boton boton-contorno" disabled={pendiente||nuevo===rol}>{t(pendiente?'guardando':'guardar')}</button>
  {estado!=='inicio'&&<p role={estado==='guardado'?'status':'alert'}>{t(estado)}</p>}
 </form>;
}
