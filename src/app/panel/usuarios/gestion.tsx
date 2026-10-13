'use client';
import {useCambiosAdmin} from '@/components/use-cambios-admin';
import {useProteccionPanel} from '@/components/proteger-cambios-panel';
import * as Dialog from '@radix-ui/react-dialog';
import {useActionState,useId,useState} from 'react';
import {Settings2,X,Mail,Shield,Trash2,History} from 'lucide-react';
import {useLocale,useTranslations} from 'next-intl';
import type {UsuarioPanel} from '@/lib/usuarios-panel';
import {administrarUsuario,historialUsuario,type EstadoGestion} from './acciones';
async function accionSegura(estado:EstadoGestion,datos:FormData):Promise<EstadoGestion>{try{return await administrarUsuario(estado,datos);}catch{return 'error';}}
const exitos=new Set(['datosActualizados','recuperacionEnviada','confirmacionEnviada','accesoActualizado','bloqueado','desbloqueado','eliminado']);
function Mensaje({estado}:{estado:EstadoGestion}){const t=useTranslations('UsuariosPanel');return estado==='inicio'?null:<p className={exitos.has(estado)?'gestion-exito':'gestion-error'} role={exitos.has(estado)?'status':'alert'}>{t(estado)}</p>;}
function Campos({u,operacion}:{u:UsuarioPanel;operacion:string}){return <><input type="hidden" name="usuario" value={u.id}/><input type="hidden" name="operacion" value={operacion}/><input type="hidden" name="version" value={u.version_gestion??0}/></>;}
function Datos({u,propia}:{u:UsuarioPanel;propia:boolean}){
 const t=useTranslations('UsuariosPanel'),id=useId();const [nombre,setNombre]=useState(u.nombre),[correo,setCorreo]=useState(u.correo??'');const {confirmarGuardado}=useCambiosAdmin({nombre,correo});const [estado,accion,pendiente]=useActionState(async(estado:EstadoGestion,datos:FormData)=>{const resultado=await accionSegura(estado,datos);if(exitos.has(resultado))confirmarGuardado();return resultado;},'inicio' as EstadoGestion);
 const cambiaCorreo=correo.trim().toLowerCase()!==(u.correo??'').toLowerCase();
 return <form action={accion} onReset={e=>e.preventDefault()} className="gestion-formulario" aria-busy={pendiente}>
  <Campos u={u} operacion="datos"/><input type="hidden" name="correo_actual" value={u.correo??''}/>
  <label htmlFor={`${id}-nombre`}>{t('nombre')}</label><input id={`${id}-nombre`} name="nombre" value={nombre} onChange={e=>setNombre(e.target.value)} minLength={2} maxLength={150} required autoComplete="off"/>
  <label htmlFor={`${id}-correo`}>{t('correo')}</label><input id={`${id}-correo`} name="correo" type="email" value={correo} onChange={e=>setCorreo(e.target.value)} required maxLength={254} readOnly={propia} autoComplete="off"/>
  <p className="gestion-ayuda">{t(propia?'correoPropio':'correoDetalle')}</p>
  {cambiaCorreo&&<label className="gestion-confirmar"><input type="checkbox" name="confirmar" value="si" required/>{t('correoVerificado')}</label>}
  <Mensaje estado={estado}/><button className="boton boton-azul" disabled={pendiente||nombre===u.nombre&&!cambiaCorreo}>{t(pendiente?'guardando':'guardarDatos')}</button>
 </form>;
}
function Acceso({u,propia}:{u:UsuarioPanel;propia:boolean}){
 const t=useTranslations('UsuariosPanel'),id=useId();const actual=u.equipo_activo&&u.rol_equipo==='administrador'?'administrador':'sin_acceso';const [seleccion,setSeleccion]=useState({actual,valor:actual});const {confirmarGuardado}=useCambiosAdmin(seleccion.valor);const [estado,accion,pendiente]=useActionState(async(estado:EstadoGestion,datos:FormData)=>{const resultado=await accionSegura(estado,datos);if(exitos.has(resultado))confirmarGuardado();return resultado;},'inicio' as EstadoGestion);
 if(seleccion.actual!==actual)setSeleccion({actual,valor:actual});
 const rol=seleccion.valor,bloqueado=u.estado_cuenta!=='activo'&&Boolean(u.estado_cuenta);
 return <form action={accion} onReset={e=>e.preventDefault()} className="gestion-formulario" aria-busy={pendiente}>
  <Campos u={u} operacion="acceso"/><label htmlFor={id}>{t('accesoPanel')}</label>
  <select id={id} name="rol" value={rol} onChange={e=>setSeleccion({actual,valor:e.target.value as typeof actual})} disabled={propia||pendiente||bloqueado}><option value="sin_acceso">{t('sinAccesoPanel')}</option><option value="administrador">{t('administrador')}</option></select>
  <p className="gestion-ayuda">{t(propia?'propiaCuentaDetalle':'accesoDetalle')}</p>
  {!u.confirmado&&<p className="gestion-ayuda">{t('confirmarCorreo')}</p>}
  {rol==='administrador'&&actual!==rol&&<label className="gestion-confirmar"><input type="checkbox" name="confirmar" value="si" required/>{t('confirmarAdmin')}</label>}
  <Mensaje estado={estado}/><button className="boton boton-azul" disabled={propia||pendiente||bloqueado||rol===actual}>{t(pendiente?'guardando':'guardarAcceso')}</button>
 </form>;
}
function CorreoSeguridad({u,operacion}:{u:UsuarioPanel;operacion:'recuperacion'|'confirmacion'}){
 const t=useTranslations('UsuariosPanel');const [estado,accion,pendiente]=useActionState(accionSegura,'inicio' as EstadoGestion);
 return <form action={accion} className="gestion-correo" aria-busy={pendiente}><Campos u={u} operacion={operacion}/><button className="boton boton-contorno" disabled={!u.correo||pendiente||exitos.has(estado)}><Mail size={18} aria-hidden="true"/>{t(pendiente?'enviando':operacion==='recuperacion'?'enviarRecuperacion':'reenviarConfirmacion')}</button><Mensaje estado={estado}/></form>;
}
function Baja({u,propia,eliminar=false}:{u:UsuarioPanel;propia:boolean;eliminar?:boolean}){
 const t=useTranslations('UsuariosPanel'),id=useId();const [estado,accion,pendiente]=useActionState(accionSegura,'inicio' as EstadoGestion);
 const operacion=eliminar?'eliminar':u.estado_cuenta==='bloqueado'?'desbloquear':'bloquear';
 return <form action={accion} className="gestion-formulario gestion-baja" aria-busy={pendiente}>
  <Campos u={u} operacion={operacion}/><p className="gestion-ayuda">{t(eliminar?'eliminarDetalle':operacion==='bloquear'?'bloquearDetalle':'desbloquearDetalle')}</p>
  <label htmlFor={id}>{t('escribaIdentificador',{identificador:u.correo??u.id})}</label><input id={id} name="confirmacion" required autoComplete="off" disabled={propia||pendiente}/>
  <Mensaje estado={estado}/><button className={`boton ${eliminar?'gestion-peligro':'boton-contorno'}`} disabled={propia||pendiente||!eliminar&&u.estado_cuenta==='eliminando'}>{eliminar&&<Trash2 size={18} aria-hidden="true"/>}{t(pendiente?'guardando':operacion==='eliminar'?'eliminarUsuario':operacion==='bloquear'?'bloquearUsuario':'desbloquearUsuario')}</button>
  {propia&&<p className="gestion-ayuda">{t('propiaCuentaDetalle')}</p>}
 </form>;
}
function Historial({id}:{id:string}){
 const t=useTranslations('UsuariosPanel'),idioma=useLocale();const [eventos,setEventos]=useState<{accion:string;creado_en:string;actor:string}[]|null>(null),[pendiente,setPendiente]=useState(false),[error,setError]=useState(false);
 async function cargar(){setPendiente(true);setError(false);try{const datos=await historialUsuario(id);setEventos(datos);setError(datos===null);}catch{setError(true);}finally{setPendiente(false);}}
 const acciones:Record<string,string>={tipo_cliente:t('eventoTipoCliente'),perfil:t('eventoPerfil'),correo:t('eventoCorreo'),recuperacion:t('eventoRecuperacion'),confirmacion:t('eventoConfirmacion'),rol:t('eventoRol'),bloquear:t('eventoBloquear'),desbloquear:t('eventoDesbloquear'),eliminacion_solicitada:t('eventoEliminarSolicitud'),eliminado:t('eventoEliminado')};
 return <div className="gestion-historial"><button type="button" className="boton boton-contorno" onClick={cargar} disabled={pendiente}><History size={18} aria-hidden="true"/>{t('verHistorial')}</button>{pendiente?<div role="status" aria-label={t('cargando')}><div className="esqueleto"/><div className="esqueleto"/></div>:error?<p role="alert" className="gestion-error">{t('error')}</p>:eventos&&<>{!eventos.length?<p>{t('sinHistorial')}</p>:<ol>{eventos.map((e,i)=><li key={i}><strong>{acciones[e.accion]??t('eventoPerfil')}</strong><span>{e.actor||t('sinNombre')} · {new Intl.DateTimeFormat(idioma==='en'?'en-US':'es-CR',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Costa_Rica'}).format(new Date(e.creado_en))}</span></li>)}</ol>}</>}</div>;
}
export function GestionUsuario({u,propia}:{u:UsuarioPanel;propia:boolean}){
 const t=useTranslations('UsuariosPanel');const [abierto,setAbierto]=useState(false);const proteccion=useProteccionPanel();
 return <Dialog.Root open={abierto} onOpenChange={valor=>{if(!valor&&proteccion)proteccion.solicitar(()=>setAbierto(false));else setAbierto(valor);}}><Dialog.Trigger className="boton boton-contorno usuario-administrar"><Settings2 size={17} aria-hidden="true"/>{t('administrar')}</Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="gestion-fondo"/><Dialog.Content className="gestion-modal">
  <header className="gestion-cabecera"><div><Dialog.Title>{t('administrarUsuario')}</Dialog.Title><Dialog.Description>{u.nombre||u.correo||t('sinNombre')}</Dialog.Description></div><Dialog.Close className="boton-icono" aria-label={t('cerrar')}><X aria-hidden="true"/></Dialog.Close></header>
  <div className="gestion-contenido"><section><h3>{t('datos')}</h3><Datos u={u} propia={propia}/></section><section><h3><Shield size={18} aria-hidden="true"/>{t('accesoPanel')}</h3><Acceso u={u} propia={propia}/></section>
  <section><h3>{t('seguridad')}</h3><p className="gestion-ayuda">{t('recuperacionDetalle',{correo:u.correo??t('sinCorreo')})}</p><CorreoSeguridad u={u} operacion="recuperacion"/>{!u.confirmado&&<CorreoSeguridad u={u} operacion="confirmacion"/>}<details><summary>{t(u.estado_cuenta==='bloqueado'?'desbloquearUsuario':'bloquearUsuario')}</summary><Baja u={u} propia={propia}/></details></section>
  <section><h3>{t('historial')}</h3><Historial id={u.id}/></section>
  <details className="gestion-eliminar"><summary>{t('eliminarUsuario')}</summary><Baja u={u} propia={propia} eliminar/></details></div>
 </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
