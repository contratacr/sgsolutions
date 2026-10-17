'use client';
import Link from 'next/link';
import {useActionState,useState,useEffect} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {Plus,Archive,RotateCcw,Pencil,ClipboardList} from 'lucide-react';
import {useTranslations,useLocale} from 'next-intl';
import {MarcoModal} from '@/components/marco-modal';
import {useProteccionPanel} from '@/components/proteger-cambios-panel';
import {useRouter} from 'next/navigation';
import {useCambiosAdmin} from '@/components/use-cambios-admin';
import {camposSoporte,type DatosSoporte,type EntidadSoporte,type FilaSoporte,type OpcionSoporte} from '@/lib/soporte-modelo';
import {guardarSoporte,archivarSoporte,type ResultadoSoporte} from './acciones';
const inicio:ResultadoSoporte={estado:'inicio'};
function Formulario({tipo,fila,datos,listo}:{tipo:EntidadSoporte;fila?:FilaSoporte;datos:DatosSoporte;listo:()=>void}){
 const t=useTranslations('SoportePanel');
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
 {camposSoporte[tipo].map(c=>{const id=`soporte-${tipo}-${c.nombre}`,error=estado.campos?.includes(c.nombre);return <div key={c.nombre} className={c.tipo==='textarea'?'gestion-soporte-ancho':undefined}>
 <label htmlFor={id}>{t('campos.'+c.nombre)}{c.obligatorio&&<span aria-hidden="true"> *</span>}</label>
 {c.tipo==='select'?<select id={id} name={c.nombre} value={String(valores[c.nombre]??'')} onChange={e=>elegir(c.nombre,e.target.value)} required={c.obligatorio} aria-invalid={error} disabled={pendiente}>
 {!c.opciones&&<option value="">{t(c.obligatorio?'seleccionar':'sinAsignar')}</option>}
 {c.opciones?c.opciones.map(o=><option key={o} value={o}>{t('valores.'+o)}</option>):<>{String(valores[c.nombre]??'')&&!opciones(c.nombre).some(o=>o.id===valores[c.nombre])&&<option value={String(valores[c.nombre])}>{t('referenciaArchivada')}</option>}{opciones(c.nombre).map(o=><option key={o.id} value={o.id}>{o.nombre}</option>)}</>}
 </select>:c.tipo==='textarea'?<textarea id={id} name={c.nombre} value={String(valores[c.nombre])} onChange={e=>elegir(c.nombre,e.target.value)} maxLength={c.max} required={c.obligatorio} aria-invalid={error} disabled={pendiente} rows={3}/>:c.tipo==='checkbox'?<input id={id} name={c.nombre} type="checkbox" checked={Boolean(valores[c.nombre])} onChange={e=>elegir(c.nombre,e.target.checked)} disabled={pendiente}/>:<input id={id} name={c.nombre} type={c.tipo==='date'?'date':c.tipo==='email'?'email':'text'} value={String(valores[c.nombre])} onChange={e=>elegir(c.nombre,e.target.value)} maxLength={c.max} required={c.obligatorio} aria-invalid={error} disabled={pendiente} min={c.tipo==='date'?'2000-01-01':undefined} max={c.tipo==='date'?'2100-12-31':undefined}/>}
 {c.nombre==='cliente_nombre'&&<small>{t('propietarioAyuda')}</small>}
 </div>;})}
 {estado.estado!=='inicio'&&<p role="alert" className="gestion-soporte-ancho gestion-soporte-error">{t('mensajes.'+estado.estado)}</p>}
 <div className="gestion-soporte-ancho gestion-soporte-form-acciones"><button className="boton boton-azul" disabled={pendiente}>{t(pendiente?'guardando':'guardar')}</button><Dialog.Close className="boton boton-contorno" disabled={pendiente}>{t('cancelar')}</Dialog.Close></div>
 </form>;
}
function Archivo({tipo,fila,listo}:{tipo:EntidadSoporte;fila:FilaSoporte;listo:(valor:string)=>void}){
 const t=useTranslations('SoportePanel');
 const [estado,accion,pendiente]=useActionState(async(prev:ResultadoSoporte,form:FormData)=>{let r:ResultadoSoporte;try{r=await archivarSoporte(prev,form);}catch{r={estado:'noDisponible'};}if(['archivado','restaurado'].includes(r.estado))listo(r.estado);return r;},inicio);
 return <form action={accion} className="gestion-soporte-archivar"><input type="hidden" name="entidad" value={tipo}/><input type="hidden" name="id" value={fila.id}/><input type="hidden" name="version" value={fila.version}/><input type="hidden" name="archivar" value={fila.archivado?'no':'si'}/><button className="boton boton-contorno" disabled={pendiente}>{fila.archivado?<RotateCcw size={16} aria-hidden="true"/>:<Archive size={16} aria-hidden="true"/>}{t(pendiente?'guardando':fila.archivado?'restaurar':'archivar')}</button>{estado.estado!=='inicio'&&!['archivado','restaurado'].includes(estado.estado)&&<p role="alert">{t('mensajes.'+estado.estado)}</p>}</form>;
}
export function GestionSoporte({tipo,datos,archivados}:{tipo:EntidadSoporte;datos:DatosSoporte;archivados:boolean}){
 const t=useTranslations('SoportePanel'),idioma=useLocale(),proteccion=useProteccionPanel();
 const [editar,setEditar]=useState<FilaSoporte|null|undefined>(undefined),[mensaje,setMensaje]=useState('');
 useEffect(()=>{if(!mensaje)return;const temporizador=setTimeout(()=>setMensaje(''),4500);return()=>clearTimeout(temporizador);},[mensaje]);
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
 return <>
 <div className="gestion-soporte-resumen"><p>{t(archivados?'archivoAyuda':'gestionAyuda')}</p>{!archivados&&<button className="boton boton-azul" onClick={()=>setEditar(null)}><Plus size={18} aria-hidden="true"/>{t('nuevo.'+tipo)}</button>}</div>
 {mensaje&&<p className="panel-aviso" role="status">{t('mensajes.'+mensaje)}</p>}
 {datos.filas.length===0?<div className="gestion-soporte-vacio"><ClipboardList size={32} aria-hidden="true"/><h2>{t('sinRegistros')}</h2><p>{t('vacioAyuda')}</p></div>:<ul className="gestion-soporte-registros">{datos.filas.map(r=><li key={r.id}>
 <div className="gestion-soporte-registro-cabecera"><div><span className="gestion-soporte-codigo">{`${tipo==='tickets'?'ST':tipo==='equipos'?'EQ':tipo==='empresas'?'EM':'MT'}-${String(r.numero).padStart(4,'0')}`}</span><h2>{etiqueta(r)}</h2></div><div className="gestion-soporte-insignias">{r.prioridad&&<span data-prioridad={r.prioridad}>{t('valores.'+r.prioridad)}</span>}{r.estado&&<span>{t('valores.'+r.estado)}</span>}{tipo==='mantenimientos'&&<span>{t(r.completado?'completado':'programado')}</span>}</div></div>
 <p className="gestion-soporte-fecha">{t('actualizado',{fecha:fecha(r.actualizado_en)})}</p>
 <details><summary>{t('verDetalle')}</summary><dl className="gestion-soporte-datos">{camposSoporte[tipo].map(c=><div key={c.nombre}><dt>{t('campos.'+c.nombre)}</dt><dd>{dato(c.nombre,r[c.nombre])}</dd></div>)}</dl>
 {tipo==='tickets'&&<Adjuntos ticket={r.id} archivado={r.archivado}/>}
 <h3>{t('historial')}</h3><ol className="gestion-soporte-historial">{datos.historial.filter(h=>h.registro_id===r.id).map(h=><li key={h.id}>{t('acciones.'+h.accion)} · {fecha(h.fecha)}{h.actor_nombre&&` · ${h.actor_nombre}`}</li>)}</ol>
 <div className="gestion-soporte-registro-acciones">{!r.archivado&&<button className="boton boton-contorno" onClick={()=>setEditar(r)}><Pencil size={16} aria-hidden="true"/>{t('editar')}</button>}<Archivo tipo={tipo} fila={r} listo={setMensaje}/></div>
 </details>
 </li>)}</ul>}
 <Dialog.Root open={editar!==undefined} onOpenChange={abierto=>{if(!abierto){if(proteccion)proteccion.solicitar(()=>setEditar(undefined));else setEditar(undefined);}}}><Dialog.Portal><Dialog.Overlay className="modal-fondo"/><MarcoModal className="gestion-soporte-editor"><Dialog.Title>{t(editar?'editar':'nuevo.'+tipo)}</Dialog.Title><Dialog.Description>{t('formAyuda')}</Dialog.Description>{editar!==undefined&&<Formulario tipo={tipo} fila={editar??undefined} datos={datos} listo={()=>{setEditar(undefined);setMensaje('guardado');}}/>}</MarcoModal></Dialog.Portal></Dialog.Root>
 </>;
}
function Adjuntos({ticket,archivado}:{ticket:string;archivado:boolean}){
 const t=useTranslations('SoportePanel'),router=useRouter();const [archivos,setArchivos]=useState<{id:string;nombre:string}[]|null>(null),[mensaje,setMensaje]=useState(''),[pendiente,setPendiente]=useState(false);
 const cargar=async()=>{try{const r=await fetch(`/api/panel/soporte/adjuntos?ticket=${ticket}`,{cache:'no-store'});if(!r.ok)throw new Error();setArchivos(await r.json());}catch{setMensaje('noDisponible');}};
 return <section className="gestion-soporte-adjuntos"><h3>{t('adjuntos')}</h3><p>{t('adjuntosAyuda')}</p><button type="button" className="boton boton-contorno" onClick={cargar}>{t('verAdjuntos')}</button>{archivos&&<ul>{archivos.map(a=><li key={a.id}><Link href={`/api/panel/soporte/adjuntos/${a.id}`}>{a.nombre}</Link></li>)}{archivos.length===0&&<li>{t('sinAdjuntos')}</li>}</ul>}{!archivado&&<form onSubmit={async e=>{e.preventDefault();setPendiente(true);setMensaje('');const form=e.currentTarget;try{const r=await fetch('/api/panel/soporte/adjuntos',{method:'POST',body:new FormData(form)});if(!r.ok)throw new Error();form.reset();await cargar();router.refresh();setMensaje('guardado');}catch{setMensaje('adjuntoError');}finally{setPendiente(false);}}}><input type="hidden" name="ticket" value={ticket}/><label htmlFor={'archivo-'+ticket}>{t('adjuntar')}</label><input id={'archivo-'+ticket} type="file" name="archivo" accept="image/jpeg,image/png,image/webp" required disabled={pendiente}/><button className="boton boton-contorno" disabled={pendiente}>{t(pendiente?'guardando':'subir')}</button></form>}{mensaje&&<p role={mensaje==='guardado'?'status':'alert'}>{t('mensajes.'+mensaje)}</p>}</section>;
}
