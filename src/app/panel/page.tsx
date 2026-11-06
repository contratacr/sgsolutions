import {exigirAdminMfa} from '@/lib/acceso-panel';
import Link from 'next/link';
import {Headset,Package,MessagesSquare,ChartNoAxesCombined,FileText,Truck,Users} from 'lucide-react';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { cerrarSesion } from '@/app/acceso/acciones';
import {sesionLocal} from '@/lib/admin-local';
export const metadata = {robots: {index: false, follow: false}};
export default async function Panel() {
 await exigirAdminMfa();
  const cliente = await crearClienteServidor();
  const local=await sesionLocal();
  if (!cliente&&!local) redirect('/admin');
  const {data: {user}} = cliente?await cliente.auth.getUser():{data:{user:null}};
  if (!user&&!local) redirect('/admin');
  const {data: perfil} = local?{data:local}:await cliente!.from('perfiles').select('id,rol,activo').eq('id', user!.id).eq('activo', true).maybeSingle();
  const acceso = await getTranslations('Acceso');
  if (!perfil) return <main id="contenido" className="contenedor seccion"><h1>{acceso('sinPermiso')}</h1><form action={cerrarSesion}><button className="boton boton-azul">{acceso('salir')}</button></form></main>;
  const t = await getTranslations('Panel');
  const analitica = await getTranslations('Analitica');
  const soporte=await getTranslations('SoportePanel');
  const grupos=[
   {titulo:'operaciones',items:[{href:'/panel/pedidos',titulo:t('pedidos'),detalle:t('pedidosDetalle'),Icono:MessagesSquare},{href:'/panel/soporte',titulo:soporte('titulo'),detalle:t('soporteDetalle'),Icono:Headset},{href:'/panel/usuarios',titulo:t('usuarios'),detalle:t('usuariosDetalle'),Icono:Users}]},
   {titulo:'tiendaContenido',items:[{href:'/panel/catalogo',titulo:t('productos'),detalle:t('productosDetalle'),Icono:Package},{href:'/panel/proveedores',titulo:t('proveedores'),detalle:t('proveedoresDetalle'),Icono:Truck},{href:'/panel/contenido',titulo:t('contenido'),detalle:t('contenidoDetalle'),Icono:FileText}]},
   {titulo:'resultados',items:[{href:'/panel/estadisticas',titulo:analitica('tituloPanel'),detalle:t('estadisticasDetalle'),Icono:ChartNoAxesCombined}]}
  ];
  return <main id="contenido" className="contenedor seccion panel-inicio"><div className="panel-bienvenida"><div><p className="etiqueta">{acceso('etiqueta')}</p><h1>{t('titulo')}</h1><p>{t('inicioAyuda')}</p></div><span className="panel-cuenta">{local?.correo??user?.email}</span></div>{local&&<p className="panel-aviso" role="status">{t('pruebaLocal')}</p>}{perfil.rol==='administrador'&&grupos.map(grupo=><section className="panel-grupo-modulos" key={grupo.titulo}><h2>{t(grupo.titulo)}</h2><div className="panel-modulos">{grupo.items.map(({href,titulo,detalle,Icono})=><Link key={href} href={href}><Icono size={24} aria-hidden="true" className="panel-modulo-icono"/><div><h3>{titulo}</h3><p>{detalle}</p></div><span className="panel-modulo-flecha" aria-hidden="true">→</span></Link>)}</div></section>)}</main>;
}
