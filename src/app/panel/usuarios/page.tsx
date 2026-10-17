import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getLocale,getTranslations} from 'next-intl/server';
import {accesoUsuarios,type UsuarioPanel} from '@/lib/usuarios-panel';
import {GestionUsuario} from './gestion';
export async function generateMetadata(){const t=await getTranslations('UsuariosPanel');return {title:t('titulo'),robots:{index:false,follow:false}};}
export default async function Usuarios({searchParams}:{searchParams:Promise<{q?:string;pagina?:string;resultado?:string}>}){
 const t=await getTranslations('UsuariosPanel'),idioma=await getLocale();const params=await searchParams;
 const q=typeof params.q==='string'?params.q.trim().slice(0,150):'';
 const valor=Number(params.pagina),pagina=Number.isSafeInteger(valor)&&valor>0?Math.min(valor,100000):1;
 let usuarios:UsuarioPanel[]=[],total=0,local=false,error=false,sinPermiso=false,actor='';
 try{
  const acceso=await accesoUsuarios();local=acceso.local;if(!acceso.local)actor=acceso.actor;
  if(!acceso.local){
   const respuesta=await acceso.cliente.rpc('listar_usuarios_panel',{busqueda:q,pagina});
   if(respuesta.error)error=true;
   else{usuarios=respuesta.data?.usuarios??[];total=Number(respuesta.data?.total??0);}
  }
 }catch(e){sinPermiso=e instanceof Error&&e.message==='SIN_PERMISO';error=!sinPermiso;}
 if(sinPermiso)redirect('/admin');
 const paginas=Math.max(1,Math.ceil(total/25));
 const fecha=(valor:string|null)=>valor?new Intl.DateTimeFormat(idioma==='en'?'en-US':'es-CR',{dateStyle:'medium',timeZone:'America/Costa_Rica'}).format(new Date(valor)):t('sinAcceso');
 return <main id="contenido" className="contenedor seccion usuarios-panel">
  <div className="panel-cabecera"><div><p className="etiqueta">{t('etiqueta')}</p><h1>{t('titulo')}</h1></div></div>
  {['eliminado','registroFallido'].includes(params.resultado??'')&&<p className="panel-aviso" role="status">{t(params.resultado as 'eliminado')}</p>}
  {local?<p role="status" className="panel-aviso">{t('local')}</p>:error?<p role="alert" className="panel-aviso">{t('errorCarga')}</p>:<>
   <form method="get" className="usuarios-busqueda"><label htmlFor="usuarios-q">{t('buscar')}</label><div><input id="usuarios-q" type="search" name="q" maxLength={150} defaultValue={q} placeholder={t('buscarEjemplo')}/><button className="boton boton-azul">{t('buscarBoton')}</button>{q&&<Link className="boton boton-contorno" href="/panel/usuarios">{t('limpiar')}</Link>}</div></form>
   <p className="usuarios-total" role="status">{t('total',{total})}</p>
   {usuarios.length===0?<p className="usuarios-vacio">{t(q?'sinResultados':'sinUsuarios')}</p>:<ul className="usuarios-lista">{usuarios.map(u=><li key={u.id} className="usuario-tarjeta">
    <div className="usuario-identidad"><h2>{u.nombre||t('sinNombre')}</h2><p>{u.correo??t('sinCorreo')}</p><div className="usuario-etiquetas">{u.estado_cuenta&&u.estado_cuenta!=='activo'&&<span className="usuario-pendiente">{t(u.estado_cuenta==='bloqueado'?'estadoBloqueado':'estadoEliminando')}</span>}<span className={u.confirmado?'usuario-confirmado':'usuario-pendiente'}>{t(u.confirmado?'confirmado':'pendiente')}</span><span>{t(u.equipo_activo&&u.rol_equipo==='administrador'?'administrador':'cliente')}</span></div></div>
    <dl><div><dt>{t('registro')}</dt><dd>{fecha(u.creado_en)}</dd></div><div><dt>{t('ultimoAcceso')}</dt><dd>{fecha(u.ultimo_acceso)}</dd></div></dl>
    <div className="usuario-asignacion"><GestionUsuario u={u} propia={u.id===actor}/></div>
   </li>)}</ul>}
   <nav className="usuarios-paginacion" aria-label={t('paginacion')}>
    {pagina>1&&<Link className="boton boton-contorno" href={`/panel/usuarios?q=${encodeURIComponent(q)}&pagina=${pagina-1}`}>{t('anterior')}</Link>}
    <span>{t('pagina',{pagina,total:paginas})}</span>
    {pagina<paginas&&<Link className="boton boton-contorno" href={`/panel/usuarios?q=${encodeURIComponent(q)}&pagina=${pagina+1}`}>{t('siguiente')}</Link>}
   </nav>
  </>}
 </main>;
}
