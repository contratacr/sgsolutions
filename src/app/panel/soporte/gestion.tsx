'use client';
import {useActionState,useState,useId,useRef,type ReactNode} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {Plus,Archive,RotateCcw,Pencil,ClipboardList,X} from 'lucide-react';
import {useTranslations,useLocale} from 'next-intl';
import {MarcoModal} from '@/components/marco-modal';
import {useProteccionPanel} from '@/components/proteger-cambios-panel';
import {useRouter} from 'next/navigation';
import {useCambiosAdmin} from '@/components/use-cambios-admin';
import {camposSoporte,type DatosSoporte,type EntidadSoporte,type FilaSoporte,type OpcionSoporte} from '@/lib/soporte-modelo';
import {guardarSoporte,archivarSoporte,type ResultadoSoporte} from './acciones';
const inicio:ResultadoSoporte={estado:'inicio'};
function Formulario({tipo,fila,datos,listo}:{tipo:EntidadSoporte;fila?:FilaSoporte;datos:DatosSoporte;listo:()=>void}){
 const t=useTranslations('SoportePanel'),idError=useId();
 const [valores,setValores]=useState<Record<string,string|boolean>>(()=>Object.fromEntries(camposSoporte[tipo].map(c=>[c.nombre,fila?.[c.nombre]??(c.tipo==='checkbox'?false:c.opciones?.[0]??'')])) as Record<string,string|boolean>);
 const {confirmarGuardado}=useCambiosAdmin(valores);
 const [estado,accion,pendiente]=useActionState(async(prev:ResultadoSoporte,form:FormData)=>{let r:ResultadoSoporte;try{r=await guardarSoporte(prev,form);}catch{r={estado:'noDisponible'};}if(r.estado==='guardado'){confirmarGuardado();listo();}return r;},inicio);
 const elegir=(nombre:string,valor:string|boolean)=>setValores(v=>({...v,[nombre]:valor,...(nombre==='empresa_id'?{equipo_id:'',cliente_nombre:''}:{}),...(nombre==='equipo_id'?{ticket_id:''}:{})}));
 function opciones(nombre:string):OpcionSoporte[]{
  if(nombre==='empresa_id')return datos.empresas;
  if(nombre==='equipo_id')return datos.equipos.filter(e=>tipo!=='tickets'||(e.empresa_id??'')===(valores.empresa_id||''));
  if(nombre==='tecnico_id')return datos.tecnicos;
  if(nombre==='ticket_id')return datos.tickets.filter(e=>e.equipo_id===valores.equipo_id);
  return [];
 }
 return <form action={accion} className="gestion-soporte-form" aria-busy={pendiente}>
 <input type="hidden" name="entidad" value={tipo}/><input type="hidden" name="id" value={fila?.id??''}/><input type="hidden" name="version" value={fila?.version??0}/>
 {camposSoporte[tipo].map(c=>{const id=`soporte-${tipo}-${c.nombre}`,error=estado.campos?.includes(c.nombre),ayuda=c.nombre==='cliente_nombre'?id+'-ayuda':'',descrito=[error&&estado.estado!=='inicio'?idError:'',ayuda].filter(Boolean).join(' ')||undefined;return <div key={c.nombre} className={c.tipo==='textarea'?'gestion-soporte-ancho':undefined}>
 <label htmlFor={id}>{t('campos.'+c.nombre)}{c.obligatorio&&<span aria-hidden="true"> *</span>}</label>
 {c.tipo==='select'?<select id={id} name={c.nombre} value={String(valores[c.nombre]??'')} onChange={e=>elegir(c.nombre,e.target.value)} required={c.obligatorio} aria-invalid={error} aria-describedby={descrito} disabled={pendiente}>
 {!c.opciones&&<option value="">{t(c.obligatorio?'seleccionar':'sinAsignar')}</option>}
 {c.opciones?c.opciones.map(o=><option key={o} value={o}>{t('valores.'+o)}</option>):<>{String(valores[c.nombre]??'')&&!opciones(c.nombre).some(o=>o.id===valores[c.nombre])&&<option value={String(valores[c.nombre])}>{t('referenciaArchivada')}</option>}{opciones(c.nombre).map(o=><option key={o.id} value={o.id}>{o.nombre}</option>)}</>}
 </select>:c.tipo==='textarea'?<textarea id={id} name={c.nombre} value={String(valores[c.nombre])} onChange={e=>elegir(c.nombre,e.target.value)} maxLength={c.max} required={c.obligatorio} aria-invalid={error} aria-describedby={descrito} disabled={pendiente} rows={3}/>:c.tipo==='checkbox'?<input id={id} name={c.nombre} type="checkbox" checked={Boolean(valores[c.nombre])} onChange={e=>elegir(c.nombre,e.target.checked)} disabled={pendiente}/>:<input id={id} name={c.nombre} type={c.tipo==='date'?'date':c.tipo==='email'?'email':'text'} value={String(valores[c.nombre])} onChange={e=>elegir(c.nombre,e.target.value)} maxLength={c.max} required={c.obligatorio} aria-invalid={error} aria-describedby={descrito} disabled={pendiente} min={c.tipo==='date'?'2000-01-01':undefined} max={c.tipo==='date'?'2100-12-31':undefined}/>}
 {ayuda&&<small id={ayuda}>{t('propietarioAyuda')}</small>}
 </div>;})}
 {estado.estado!=='inicio'&&<p id={idError} role="alert" className="gestion-soporte-ancho gestion-soporte-error">{t('mensajes.'+estado.estado)}</p>}
 <div className="gestion-soporte-ancho gestion-soporte-form-acciones"><button className="boton boton-azul" disabled={pendiente}>{t(pendiente?'guardando':'guardar')}</button><Dialog.Close className="boton boton-contorno" disabled={pendiente}>{t('cancelar')}</Dialog.Close></div>
 </form>;
}
type MensajeSoporte={id:number;clave:string;detalle?:string};
const tonoSoporte:Record<string,'exito'|'aviso'|'peligro'|'info'|'neutro'>={alta:'peligro',media:'aviso',baja:'neutro',pendiente:'info',en_proceso:'aviso',resuelto:'exito',cerrado:'neutro',operativo:'exito',mantenimiento:'aviso',fuera_servicio:'peligro'};
const prefijos:Record<EntidadSoporte,string>={tickets:'ST',equipos:'EQ',empresas:'EM',mantenimientos:'MT'};
function Archivo({tipo,fila,nombre,listo}:{tipo:EntidadSoporte;fila:FilaSoporte;nombre:string;listo:(valor:string)=>void}){
 const t=useTranslations('SoportePanel'),[abierto,setAbierto]=useState(false);
 const [estado,accion,pendiente]=useActionState(async(prev:ResultadoSoporte,form:FormData)=>{let r:ResultadoSoporte;try{r=await archivarSoporte(prev,form);}catch{r={estado:'noDisponible'};}if(['archivado','restaurado'].includes(r.estado)){setAbierto(false);listo(r.estado);}return r;},inicio);
 const error=estado.estado!=='inicio'&&!['archivado','restaurado'].includes(estado.estado)?<p role="alert" className="gestion-soporte-error">{t('mensajes.'+estado.estado)}</p>:null;
 const formulario=(contenido:ReactNode)=><form action={accion} className="gestion-soporte-archivar"><input type="hidden" name="entidad" value={tipo}/><input type="hidden" name="id" value={fila.id}/><input type="hidden" name="version" value={fila.version}/><input type="hidden" name="archivar" value={fila.archivado?'no':'si'}/>{contenido}</form>;
 if(fila.archivado)return formulario(<><button className="boton boton-contorno" disabled={pendiente}><RotateCcw size={16} aria-hidden="true"/>{t(pendiente?'guardando':'restaurar')}</button>{error}</>);
 return <Dialog.Root open={abierto} onOpenChange={valor=>{if(!pendiente)setAbierto(valor);}}><Dialog.Trigger className="boton boton-contorno" aria-label={`${t('archivar')}: ${nombre}`}><Archive size={16} aria-hidden="true"/>{t('archivar')}</Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="modal-fondo"/><MarcoModal className="gestion-soporte-confirmar" cierreDeshabilitado={pendiente}><Dialog.Title>{t('archivarTitulo')}</Dialog.Title><Dialog.Description>{t('archivarDetalle',{nombre})}</Dialog.Description>{formulario(<>{error}<div className="gestion-soporte-form-acciones"><button className="boton boton-azul" disabled={pendiente}><Archive size={16} aria-hidden="true"/>{t(pendiente?'guardando':'archivarConfirmar')}</button><Dialog.Close className="boton boton-contorno" disabled={pendiente}>{t('cancelar')}</Dialog.Close></div></>)}</MarcoModal></Dialog.Portal></Dialog.Root>;
}
export function GestionSoporte({tipo,datos,archivados}:{tipo:EntidadSoporte;datos:DatosSoporte;archivados:boolean}){
 const t=useTranslations('SoportePanel'),idioma=useLocale(),proteccion=useProteccionPanel();
 const [editar,setEditar]=useState<FilaSoporte|null|undefined>(undefined),[mensajes,setMensajes]=useState<MensajeSoporte[]>([]),contador=useRef(0);
 // Cada acción conserva su propio mensaje hasta que la persona lo cierre (WCAG 2.2.1).
 const avisar=(clave:string,detalle?:string)=>{contador.current+=1;const id=contador.current;setMensajes(m=>[...m.slice(-2),{id,clave,detalle}]);};
 const fecha=(v:string)=>new Intl.DateTimeFormat(idioma==='en'?'en-US':'es-CR',{dateStyle:'medium',timeZone:'America/Costa_Rica'}).format(new Date(v));
 const etiqueta=(r:FilaSoporte)=>String(r.asunto??r.razon_social??r.nombre??r.descripcion);
 function dato(nombre:string,valor:string|number|boolean|null):string{
  if(typeof valor==='boolean')return t(valor?'si':'no');
  if(!valor)return t('sinAsignar');
  if(['estado','prioridad'].includes(nombre)||nombre==='tipo'&&tipo==='mantenimientos')return t('valores.'+valor);
  if(nombre==='fecha')return fecha(String(valor)+'T12:00:00Z');
  if(nombre.endsWith('_id'))return (nombre==='empresa_id'?datos.empresas:nombre==='equipo_id'?datos.equipos:nombre==='ticket_id'?datos.tickets:datos.tecnicos).find(o=>o.id===valor)?.nombre??t('referenciaArchivada');
  return String(valor);
 }
 const chip=(valor:string,campo:'prioridad'|'estado')=><span className="panel-chip" data-tono={tonoSoporte[valor]??'neutro'}><span className="sr-only">{t('campos.'+campo)}: </span>{t('valores.'+valor)}</span>;
 return <>
 <div className="gestion-soporte-resumen"><p>{t(archivados?'archivoAyuda':'gestionAyuda')}</p>{!archivados&&<button className="boton boton-azul" onClick={()=>setEditar(null)}><Plus size={18} aria-hidden="true"/>{t('nuevo.'+tipo)}</button>}</div>
 <div className="gestion-soporte-mensajes" role="status">{mensajes.map(m=><p key={m.id} className="panel-aviso gestion-soporte-mensaje"><span>{t('mensajes.'+m.clave)}{m.detalle&&<> · {m.detalle}</>}</span><button type="button" className="gestion-soporte-cerrar" aria-label={t('cerrarMensaje')} onClick={()=>setMensajes(lista=>lista.filter(x=>x.id!==m.id))}><X size={16} aria-hidden="true"/></button></p>)}</div>
 {datos.filas.length===0?<div className="panel-vacio"><ClipboardList size={32} aria-hidden="true"/><h2>{t('sinRegistros')}</h2><p>{t(archivados?'vacioArchivo':'vacioAyuda')}</p></div>:<ul className="gestion-soporte-registros">{datos.filas.map(r=>{const numero=String(r.numero).padStart(4,'0'),nombre=etiqueta(r);return <li key={r.id}>
 <div className="gestion-soporte-registro-cabecera"><div><span className="gestion-soporte-codigo"><span aria-hidden="true">{`${prefijos[tipo]}-${numero}`}</span><span className="sr-only">{t('codigoAccesible',{tipo:t('codigos.'+tipo),numero})}</span></span><h2>{nombre}</h2></div><div className="gestion-soporte-insignias">{r.prioridad&&chip(String(r.prioridad),'prioridad')}{r.estado&&chip(String(r.estado),'estado')}{tipo==='mantenimientos'&&<span className="panel-chip" data-tono={r.completado?'exito':'info'}>{t(r.completado?'completado':'programado')}</span>}</div></div>
 <p className="gestion-soporte-fecha">{t('actualizado',{fecha:fecha(r.actualizado_en)})}</p>
 <div className="gestion-soporte-registro-acciones">{!r.archivado&&<button className="boton boton-contorno" aria-label={`${t('editar')}: ${nombre}`} onClick={()=>setEditar(r)}><Pencil size={16} aria-hidden="true"/>{t('editar')}</button>}<Archivo tipo={tipo} fila={r} nombre={nombre} listo={clave=>avisar(clave,nombre)}/></div>
 <details><summary>{t('verDetalle')}</summary><dl className="gestion-soporte-datos">{camposSoporte[tipo].map(c=><div key={c.nombre}><dt>{t('campos.'+c.nombre)}</dt><dd>{dato(c.nombre,r[c.nombre])}</dd></div>)}</dl>
 {tipo==='tickets'&&<Adjuntos ticket={r.id} archivado={r.archivado}/>}
 <h3>{t('historial')}</h3><ol className="gestion-soporte-historial">{datos.historial.filter(h=>h.registro_id===r.id).map(h=><li key={h.id}>{t('acciones.'+h.accion)} · {fecha(h.fecha)}{h.actor_nombre&&` · ${h.actor_nombre}`}</li>)}</ol>
 </details>
 </li>;})}</ul>}
 <Dialog.Root open={editar!==undefined} onOpenChange={abierto=>{if(!abierto){if(proteccion)proteccion.solicitar(()=>setEditar(undefined));else setEditar(undefined);}}}><Dialog.Portal><Dialog.Overlay className="modal-fondo"/><MarcoModal className="gestion-soporte-editor"><Dialog.Title>{t(editar?'editar':'nuevo.'+tipo)}</Dialog.Title><Dialog.Description>{t('formAyuda')}</Dialog.Description>{editar!==undefined&&<Formulario tipo={tipo} fila={editar??undefined} datos={datos} listo={()=>{const nombre=editar?etiqueta(editar):undefined;setEditar(undefined);avisar('guardado',nombre);}}/>}</MarcoModal></Dialog.Portal></Dialog.Root>
 </>;
}
function Adjuntos({ticket,archivado}:{ticket:string;archivado:boolean}){
 const t=useTranslations('SoportePanel'),router=useRouter();const [archivos,setArchivos]=useState<{id:string;nombre:string}[]|null>(null),[mensaje,setMensaje]=useState(''),[pendiente,setPendiente]=useState(false);
 const cargar=async()=>{try{const r=await fetch(`/api/panel/soporte/adjuntos?ticket=${ticket}`,{cache:'no-store'});if(!r.ok)throw new Error();setArchivos(await r.json());return true;}catch{return false;}};
 const ver=async()=>{setMensaje('');if(!await cargar())setMensaje('noDisponible');};
 return <section className="gestion-soporte-adjuntos"><h3>{t('adjuntos')}</h3><p>{t('adjuntosAyuda')}</p><button type="button" className="boton boton-contorno" onClick={ver}>{t('verAdjuntos')}</button>{archivos&&<ul>{archivos.map(a=><li key={a.id}><a href={`/api/panel/soporte/adjuntos/${a.id}`}>{a.nombre}</a></li>)}{archivos.length===0&&<li>{t('sinAdjuntos')}</li>}</ul>}{!archivado&&<form onSubmit={async e=>{e.preventDefault();setPendiente(true);setMensaje('');const form=e.currentTarget;try{const r=await fetch('/api/panel/soporte/adjuntos',{method:'POST',body:new FormData(form)});if(!r.ok)throw new Error();form.reset();router.refresh();setMensaje(await cargar()?'guardado':'adjuntoRecarga');}catch{setMensaje('adjuntoError');}finally{setPendiente(false);}}}><input type="hidden" name="ticket" value={ticket}/><label htmlFor={'archivo-'+ticket}>{t('adjuntar')}</label><input id={'archivo-'+ticket} type="file" name="archivo" accept="image/jpeg,image/png,image/webp" required disabled={pendiente}/><button className="boton boton-contorno" disabled={pendiente}>{t(pendiente?'guardando':'subir')}</button></form>}{mensaje&&<p role={mensaje==='guardado'?'status':'alert'} className={mensaje==='guardado'?undefined:'gestion-soporte-error'}>{t('mensajes.'+mensaje)}</p>}</section>;
}
