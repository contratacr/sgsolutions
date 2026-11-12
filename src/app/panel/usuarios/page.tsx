import {exigirAdminMfa} from '@/lib/acceso-panel';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getLocale,getTranslations} from 'next-intl/server';
import {accesoUsuarios,type UsuarioPanel} from '@/lib/usuarios-panel';
import {GestionUsuario} from './gestion';
import {EncabezadoPanel} from '@/components/encabezado-panel';
import {Users} from 'lucide-react';
const FILTROS=['todos','administradores','clientes','bloqueados','sin_confirmar'] as const;
const enlace=(q:string,filtro:string,pagina=1)=>{const p=new URLSearchParams();if(q)p.set('q',q);if(filtro!=='todos')p.set('filtro',filtro);if(pagina>1)p.set('pagina',String(pagina));const s=p.toString();return '/panel/usuarios'+(s?'?'+s:'');};
export async function generateMetadata(){const t=await getTranslations('UsuariosPanel');return {title:t('titulo'),robots:{index:false,follow:false}};}
export default async function Usuarios({searchParams}:{searchParams:Promise<{q?:string;pagina?:string;resultado?:string;filtro?:string}>}){
 await exigirAdminMfa();
 const t=await getTranslations('UsuariosPanel'),panel=await getTranslations('Panel'),idioma=await getLocale();const params=await searchParams;
 const q=typeof params.q==='string'?params.q.trim().slice(0,150):'';
 const filtro=FILTROS.find(f=>f===params.filtro)??'todos';
 const valor=Number(params.pagina),pagina=Number.isSafeInteger(valor)&&valor>0?Math.min(valor,100000):1;
 let usuarios:UsuarioPanel[]=[],total=0,local=false,error=false,sinPermiso=false,actor='',filtroNoDisponible=false;
 try{
  const acceso=await accesoUsuarios();local=acceso.local;if(!acceso.local)actor=acceso.actor;
  if(!acceso.local){
   // The filter argument exists only after migration 20261111000100; without it, the full list keeps working.
   const respuesta=await acceso.cliente.rpc('listar_usuarios_panel',filtro==='todos'?{busqueda:q,pagina}:{busqueda:q,pagina,filtro});
   if(respuesta.error){if(filtro!=='todos'&&respuesta.error.code==='PGRST202')filtroNoDisponible=true;else error=true;}
   else{usuarios=respuesta.data?.usuarios??[];total=Number(respuesta.data?.total??0);const mfa=await acceso.cliente.rpc('estado_mfa_administradores');if(mfa.error)error=true;else usuarios=usuarios.map(u=>({...u,mfa_configurado:mfa.data?.[u.id]===true}));}
  }
 }catch(e){sinPermiso=e instanceof Error&&e.message==='SIN_PERMISO';error=!sinPermiso;}
 if(sinPermiso)redirect('/admin');
 const paginas=Math.max(1,Math.ceil(total/25));
 const fecha=(valor:string|null)=>valor?new Intl.DateTimeFormat(idioma==='en'?'en-US':'es-CR',{dateStyle:'medium',timeZone:'America/Costa_Rica'}).format(new Date(valor)):t('sinAcceso');
 return <main id="contenido" className="contenedor seccion usuarios-panel">
  <EncabezadoPanel seccion={panel('operaciones')} titulo={t('titulo')} descripcion={<>{t('descripcion')} {t('permisos')}</>}/>
  {['eliminado','registroFallido'].includes(params.resultado??'')&&<p className="panel-aviso" role="status">{t(params.resultado as 'eliminado')}</p>}
  {local?<p role="status" className="panel-aviso">{t('local')}</p>:error?<p role="alert" className="panel-aviso">{t('errorCarga')}</p>:<>
   <form method="get" className="usuarios-busqueda"><label htmlFor="usuarios-q">{t('buscar')}</label><div>{filtro!=='todos'&&<input type="hidden" name="filtro" value={filtro}/>}<input id="usuarios-q" type="search" name="q" maxLength={150} defaultValue={q} placeholder={t('buscarEjemplo')}/><button className="boton boton-azul">{t('buscarBoton')}</button>{q&&<Link className="boton boton-contorno" href={enlace('',filtro)}>{t('limpiar')}</Link>}</div></form>
   <nav className="usuarios-filtros" aria-label={t('filtroEtiqueta')}>{FILTROS.map(f=><Link key={f} href={enlace(q,f)} aria-current={f===filtro?'page':undefined}>{t(`filtro_${f}`)}</Link>)}</nav>
   {filtroNoDisponible&&<p role="alert" className="panel-aviso">{t('filtroNoDisponible')}</p>}
   <p className="usuarios-total" role="status">{t('total',{total})}</p>
   {usuarios.length===0?<div className="panel-vacio"><Users size={32} aria-hidden="true"/><h2>{t(q||filtro!=='todos'?'sinResultados':'sinUsuarios')}</h2><p>{t(q?'vacioBusqueda':filtro!=='todos'?'vacioFiltro':'vacioAyuda')}</p>{(q||filtro!=='todos')&&<Link className="boton boton-contorno" href="/panel/usuarios">{t('limpiar')}</Link>}</div>:<ul className="usuarios-lista">{usuarios.map(u=><li key={u.id} className="usuario-tarjeta">
    <div className="usuario-identidad"><h2>{u.nombre||t('sinNombre')}</h2><p>{u.correo??t('sinCorreo')}</p><ul className="usuario-etiquetas" aria-label={t('estadoCuenta')}><li className="panel-chip" data-tono={u.estado_cuenta==='bloqueado'||u.estado_cuenta==='eliminando'?'peligro':'exito'}>{t(u.estado_cuenta==='bloqueado'?'estadoBloqueado':u.estado_cuenta==='eliminando'?'estadoEliminando':'estadoActivo')}</li><li className="panel-chip" data-tono={u.confirmado?'neutro':'aviso'}>{t(u.confirmado?'confirmado':'pendiente')}</li>{u.equipo_activo&&u.rol_equipo==='administrador'?<><li className="panel-chip" data-tono="info">{t('administrador')}</li><li className="panel-chip" data-tono={u.mfa_configurado?'exito':'aviso'}>{t(u.mfa_configurado?'mfaConfigurado':'mfaPendiente')}</li></>:<li className="panel-chip" data-tono="neutro">{t('cliente')}</li>}</ul></div>
    <dl><div><dt>{t('registro')}</dt><dd>{fecha(u.creado_en)}</dd></div><div><dt>{t('ultimoAcceso')}</dt><dd>{fecha(u.ultimo_acceso)}</dd></div></dl>
    <div className="usuario-asignacion"><GestionUsuario u={u} propia={u.id===actor}/></div>
   </li>)}</ul>}
   {(paginas>1||pagina>1)&&<nav className="usuarios-paginacion" aria-label={t('paginacion')}>
    {pagina>1&&<Link className="boton boton-contorno" href={enlace(q,filtro,Math.min(pagina-1,paginas))}>{t('anterior')}</Link>}
    <span aria-current="page">{t('pagina',{pagina:Math.min(pagina,paginas),total:paginas})}</span>
    {pagina<paginas&&<Link className="boton boton-contorno" href={enlace(q,filtro,pagina+1)}>{t('siguiente')}</Link>}
   </nav>}
  </>}
 </main>;
}
